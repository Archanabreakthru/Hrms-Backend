# Asset Management Service — Orbyx HRMS

## Domain Scope
- **Hardware Assets:** Laptops, desktop workstations, mobile phones, serial number tracking, purchase details, warranty periods, condition lifecycle (In Stock, Allocated, Under Repair, Retired).
- **Software & Digital Assets:** SaaS licenses, IDE subscriptions, developer cloud tools, license seats, account identifiers, renewal dates, subscription costs, billing frequency.
- **Allocation & Custody Lifecycle:** Allocation to employees or departments, asset custody records, handover acknowledgments, return inspections, exit clearance verification.

## Database Ownership
- **Database:** PostgreSQL (`orbyx_asset_db`)
- **ORM:** Prisma (`prisma/schema.prisma`)
- **Owned Entities:** HardwareAssets, SoftwareLicenses, AssetAllocations, AssetMaintenanceLogs, AssetReturnInspections.

## Internal Port
- Default: `5006`

