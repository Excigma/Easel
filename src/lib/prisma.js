const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient({
  rejectOnNotFound: false
})

module.exports = {
  prisma
}
