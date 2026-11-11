# Organization Setup & Governance Service — Orbyx HRMS

## Domain Scope
- **Company Setup:** Legal entity profile, corporate registration numbers, official addresses, business contact points.
- **Branch & Location Management:** Physical branch locations, state jurisdiction (for Professional Tax state applicability), office facilities.
- **Department Setup:** Department catalog, functional units, department head allocations.
- **Designation & Role Matrix:** Job titles, designation levels, grade pay scales, standard responsibilities.
- **Reporting Hierarchy:** Corporate org tree structure, multi-tier managerial hierarchies.
- **Policy Governance:** Corporate HR policies, publication status, version revisions, policy documents, and employee acknowledgment audit logs.

## Database Ownership
- **Database:** PostgreSQL (`orbyx_org_db`)
- **ORM:** Prisma (`prisma/schema.prisma`)
- **Owned Entities:** Companies, Branches, Departments, Designations, ReportingHierarchies, Policies, PolicyAcknowledgements.

## Note on Domain Boundary
Employee profiles, personal records, identity documents, bank accounts, appraisals, and exit clearances are owned independently by [`employee-service`](../employee-service). `organization-service` provides the organizational foundation (departments, branches, designations) that employees are assigned to.

## Internal Port
- Default: `5002`
