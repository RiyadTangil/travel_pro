import {
  getPassportByIdHandler,
  updatePassportHandler,
  deletePassportHandler,
} from "@/controllers/passportController"

export const GET    = getPassportByIdHandler
export const PUT    = updatePassportHandler
export const DELETE = deletePassportHandler
