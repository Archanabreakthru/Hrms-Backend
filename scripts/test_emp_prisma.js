require('dotenv').config({ path: 'services/employee-service/.env' });
const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '../services/employee-service/src/generated/client'));
const p = new PrismaClient();

p.employee.findMany()
  .then(r => console.log('SUCCESS! Prisma employee findMany count:', r.length, 'Emp:', r[0].id, r[0].firstName, r[0].lastName, r[0].email))
  .catch(console.error)
  .finally(() => p.$disconnect());
