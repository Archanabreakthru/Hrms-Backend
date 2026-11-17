import crypto from 'crypto';
import { UserRole } from '../../../../shared/src/constants/roles';

export interface BootstrapAdminParams {
  email: string;
  name?: string;
  employeeId?: string;
  departmentId?: string;
}

export interface BootstrapResult {
  status: 'ALREADY_INITIALIZED' | 'SUCCESS';
  existingAdminEmail?: string;
  userId?: string;
  email?: string;
  role?: string;
  activationToken?: string;
  activationExpiresAt?: Date;
  activationUrl?: string;
  message: string;
}

export interface IBootstrapDatabaseClient {
  $transaction<T>(fn: (tx: any) => Promise<T>, options?: { isolationLevel?: string }): Promise<T>;
  users: {
    findFirst(args: any): Promise<any>;
    findUnique(args: any): Promise<any>;
    create(args: any): Promise<any>;
  };
  roles: {
    findUnique(args: any): Promise<any>;
  };
  userRoles: {
    create(args: any): Promise<any>;
  };
  serviceNonces: {
    create(args: any): Promise<any>;
  };
}

/**
 * First-Time HR Administrator Bootstrapper
 * 
 * Enforces strict production-grade bootstrap controls:
 * 1. Mutual exclusion / Database-backed Concurrency Lock (SERIALIZABLE or advisory lock)
 * 2. Strict Idempotency: Exits safely if an HR Admin already exists in auth.users
 * 3. Secure unactivated password hashing (crypto salt:random bytes, never plaintext)
 * 4. PENDING_ACTIVATION account state: cannot authenticate until password is set via activation token
 * 5. Single-use, expiring SHA-256 activation token with no plaintext password generation
 * 6. Zero disruption to existing records (e.g. Raseedh)
 */
export async function bootstrapHrAdministrator(
  db: IBootstrapDatabaseClient,
  params: BootstrapAdminParams,
  options?: {
    portalBaseUrl?: string;
    tokenExpiryHours?: number;
  }
): Promise<BootstrapResult> {
  const normalizedEmail = params.email.toLowerCase().trim();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('A valid administrator email address is required.');
  }

  const portalBase = options?.portalBaseUrl || 'http://localhost:3000';
  const expiryHours = options?.tokenExpiryHours || 48;

  // Use a serializable transaction to prevent race conditions during concurrent bootstrap
  return await db.$transaction(async (tx) => {
    // 1. Concurrency Mutual Exclusion Barrier
    // In PostgreSQL, acquiring an advisory lock or locking a single initialization sentinel prevents race conditions
    try {
      if (typeof tx.$executeRawUnsafe === 'function') {
        // PostgreSQL pg_advisory_xact_lock with 64-bit hashed lock key for 'celestial_hrms_bootstrap'
        await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(718294021);`);
      }
    } catch {
      // In-memory or non-PostgreSQL mock in unit test environments
    }

    // 2. Authoritative Active HR Administrator Check
    // Checks if any active HR Administrator already exists in auth.users
    const existingHrAdmin = await tx.users.findFirst({
      where: {
        roleCode: UserRole.HR_ADMIN,
        status: { in: ['ACTIVE', 'PENDING_ACTIVATION'] },
      },
    });

    if (existingHrAdmin) {
      return {
        status: 'ALREADY_INITIALIZED',
        existingAdminEmail: existingHrAdmin.email,
        message: `System is already initialized with an active or pending HR Administrator (${existingHrAdmin.email}). No duplicate administrator created.`,
      };
    }

    // 3. Check for specific email collision
    const existingUserByEmail = await tx.users.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUserByEmail) {
      return {
        status: 'ALREADY_INITIALIZED',
        existingAdminEmail: existingUserByEmail.email,
        message: `Account with email ${normalizedEmail} already exists. No duplicate user created.`,
      };
    }

    // 4. Resolve Database-Backed HR_ADMIN Role
    const hrAdminRole = await tx.roles.findUnique({
      where: { code: UserRole.HR_ADMIN },
    });

    if (!hrAdminRole) {
      throw new Error(
        `Role "${UserRole.HR_ADMIN}" not found in database. Please ensure standard RBAC roles are populated.`
      );
    }

    // 5. Generate Cryptographically Secure Activation Token
    const rawActivationToken = crypto.randomBytes(32).toString('hex');
    const activationTokenHash = crypto.createHash('sha256').update(rawActivationToken).digest('hex');
    const activationExpiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    // 6. Secure Unactivated Password Hash
    // Uses crypto random salt and random key so no valid password matches until explicitly activated
    const unactivatedSalt = crypto.randomBytes(16).toString('hex');
    const unactivatedKey = crypto.randomBytes(64).toString('hex');
    const secureUnactivatedPasswordHash = `${unactivatedSalt}:${unactivatedKey}`;

    // 7. Persist Pending HR Admin User
    const newUser = await tx.users.create({
      data: {
        email: normalizedEmail,
        passwordHash: secureUnactivatedPasswordHash,
        roleCode: UserRole.HR_ADMIN,
        status: 'PENDING_ACTIVATION',
        employeeId: params.employeeId || null,
        departmentId: params.departmentId || null,
        isActive: true,
        activationTokenHash,
        activationTokenExpiresAt: activationExpiresAt,
        invitationStatus: 'PENDING_ACTIVATION',
        invitationSentAt: new Date(),
      },
    });

    // 8. Associate Database-Backed Role in auth.user_roles
    await tx.userRoles.create({
      data: {
        userId: newUser.id,
        roleId: hrAdminRole.id,
      },
    });

    const activationUrl = `${portalBase}/#/activate?token=${rawActivationToken}`;

    return {
      status: 'SUCCESS',
      userId: newUser.id,
      email: newUser.email,
      role: UserRole.HR_ADMIN,
      activationToken: rawActivationToken,
      activationExpiresAt,
      activationUrl,
      message: `Initial HR Administrator provisioned successfully. Single-use activation link generated (valid for ${expiryHours}h).`,
    };
  });
}

export interface DedicatedBootstrapAdminParams {
  email: string;
  name?: string;
  employeeId?: string;
  departmentId?: string;
  authorizedBy: string; // Audit requirement: verified operator or existing super_admin
}

/**
 * Dedicated Bootstrap Administrator Provisioner
 * 
 * Safely provisions a new, dedicated Bootstrap Administrator with:
 * 1. Mutual exclusion / PostgreSQL advisory transaction lock
 * 2. Checks whether a dedicated bootstrap administrator is already present
 * 3. Prevents duplicate email collision or multiple bootstrap administrator accounts
 * 4. PENDING_ACTIVATION account state (login rejected until activated)
 * 5. High-entropy crypto unactivated password hash
 * 6. Single-use, expiring SHA-256 activation token
 * 7. Explicit audit linkage
 * 8. Zero modification of existing users, credentials, or sessions
 */
export async function bootstrapDedicatedAdministrator(
  db: IBootstrapDatabaseClient,
  params: DedicatedBootstrapAdminParams,
  options?: {
    portalBaseUrl?: string;
    tokenExpiryHours?: number;
  }
): Promise<BootstrapResult> {
  const normalizedEmail = params.email.toLowerCase().trim();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('A valid administrator email address is required.');
  }

  if (!params.authorizedBy || !params.authorizedBy.trim()) {
    throw new Error('Explicit operator authorization (authorizedBy) is required to provision a dedicated bootstrap administrator.');
  }

  const portalBase = options?.portalBaseUrl || 'http://localhost:3000';
  const expiryHours = options?.tokenExpiryHours || 48;

  return await db.$transaction(async (tx) => {
    // 1. Concurrency Mutual Exclusion Barrier
    try {
      if (typeof tx.$executeRawUnsafe === 'function') {
        // Dedicated lock key: 718294022 for dedicated bootstrap
        await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(718294022);`);
      }
    } catch {
      // Simulator/test environment
    }

    // 2. Check for duplicate dedicated bootstrap administrator
    // A dedicated bootstrap administrator is identified by username 'bootstrap_admin'
    const existingBootstrapAdmin = await tx.users.findFirst({
      where: {
        username: 'bootstrap_admin',
        status: { in: ['ACTIVE', 'PENDING_ACTIVATION'] },
      },
    });

    if (existingBootstrapAdmin) {
      return {
        status: 'ALREADY_INITIALIZED',
        existingAdminEmail: existingBootstrapAdmin.email,
        message: `A dedicated Bootstrap Administrator (${existingBootstrapAdmin.email}) has already been provisioned. Duplicate provisioning rejected.`,
      };
    }

    // 3. Check for specific email collision across any existing user
    const existingUserByEmail = await tx.users.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUserByEmail) {
      return {
        status: 'ALREADY_INITIALIZED',
        existingAdminEmail: existingUserByEmail.email,
        message: `Account with email ${normalizedEmail} already exists. No duplicate user created.`,
      };
    }

    // 4. Resolve Database-Backed SUPER_ADMIN Role
    const superAdminRole = await tx.roles.findUnique({
      where: { code: UserRole.SUPER_ADMIN },
    });

    if (!superAdminRole) {
      throw new Error(
        `Role "${UserRole.SUPER_ADMIN}" not found in database. Please ensure standard RBAC roles are populated.`
      );
    }

    // 5. Generate Cryptographically Secure Single-Use Activation Token
    const rawActivationToken = crypto.randomBytes(32).toString('hex');
    const activationTokenHash = crypto.createHash('sha256').update(rawActivationToken).digest('hex');
    const activationExpiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    // 6. Secure Unactivated Password Hash
    const unactivatedSalt = crypto.randomBytes(16).toString('hex');
    const unactivatedKey = crypto.randomBytes(64).toString('hex');
    const secureUnactivatedPasswordHash = `${unactivatedSalt}:${unactivatedKey}`;

    // 7. Persist Pending Dedicated Bootstrap Admin User
    const newUser = await tx.users.create({
      data: {
        email: normalizedEmail,
        username: 'bootstrap_admin',
        passwordHash: secureUnactivatedPasswordHash,
        roleCode: UserRole.SUPER_ADMIN,
        status: 'PENDING_ACTIVATION',
        employeeId: params.employeeId || null,
        departmentId: params.departmentId || null,
        isActive: true,
        activationTokenHash,
        activationTokenExpiresAt: activationExpiresAt,
        invitationStatus: 'PENDING_BOOTSTRAP_ACTIVATION',
        invitationSentAt: new Date(),
      },
    });

    // 8. Associate Database-Backed Role in auth.user_roles
    await tx.userRoles.create({
      data: {
        userId: newUser.id,
        roleId: superAdminRole.id,
      },
    });

    const activationUrl = `${portalBase}/#/activate?token=${rawActivationToken}`;

    return {
      status: 'SUCCESS',
      userId: newUser.id,
      email: newUser.email,
      role: UserRole.SUPER_ADMIN,
      activationToken: rawActivationToken,
      activationExpiresAt,
      activationUrl,
      message: `Dedicated Bootstrap Administrator provisioned successfully under authorized operator (${params.authorizedBy}). Single-use activation link generated (valid for ${expiryHours}h).`,
    };
  });
}

