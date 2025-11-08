"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { InlineLoader } from "@/components/ui/loader"
import Image from "next/image"

export type Passport = {
  id: string
  createdDate: string
  passportNo: string
  name: string
  mobile: string
  dob?: string
  doi?: string
  doe?: string
  remaining?: string
  email?: string
  scanCopyUrl?: string
  othersDocUrl?: string
  imageUrl?: string
  status: "PENDING" | "APPROVED" | "DELIVERED"
  note?: string
}

type Props = {
  data: Passport[]
  loadingId?: string | null
  onChangeStatus?: (p: Passport) => void
  onEdit?: (p: Passport) => void
  onDelete?: (p: Passport) => void
}

export function PassportTable({ data, loadingId, onChangeStatus, onEdit, onDelete }: Props) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-12">SL.</TableHead>
            <TableHead>Created Date</TableHead>
            <TableHead>Passport No</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Mobile No</TableHead>
            <TableHead>Date Of Birth</TableHead>
            <TableHead>Date Of Issue</TableHead>
            <TableHead>Date Of Expire</TableHead>
            <TableHead>Remaining</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Scan Copy</TableHead>
            <TableHead>Others Doc</TableHead>
            <TableHead>Image</TableHead>
            <TableHead>Passport Status</TableHead>
            <TableHead>Note</TableHead>
            <TableHead className="text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((p, i) => (
            <TableRow key={p.id}>
              <TableCell>{i + 1}</TableCell>
              <TableCell>{p.createdDate}</TableCell>
              <TableCell>{p.passportNo}</TableCell>
              <TableCell>{p.name}</TableCell>
              <TableCell>{p.mobile}</TableCell>
              <TableCell>{p.dob || ""}</TableCell>
              <TableCell>{p.doi || ""}</TableCell>
              <TableCell>{p.doe || ""}</TableCell>
              <TableCell>{p.remaining || ""}</TableCell>
              <TableCell>{p.email || ""}</TableCell>
              <TableCell>{p.scanCopyUrl ? <Image src={p.scanCopyUrl} width={28} height={28} alt="Scan" className="rounded"/> : ""}</TableCell>
              <TableCell>{p.othersDocUrl ? <Image src={p.othersDocUrl} width={28} height={28} alt="Other" className="rounded"/> : ""}</TableCell>
              <TableCell>{p.imageUrl ? <Image src={p.imageUrl} width={24} height={24} alt="Img" className="rounded"/> : ""}</TableCell>
              <TableCell>{p.status}</TableCell>
              <TableCell>{p.note || ""}</TableCell>
              <TableCell className="text-center">
                {loadingId === p.id ? (
                  <div className="flex items-center justify-center"><InlineLoader size={16} /></div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Button size="sm" variant="default" className="bg-sky-600" onClick={() => onChangeStatus?.(p)}>Change Status</Button>
                    <Button size="sm" variant="secondary" onClick={() => onEdit?.(p)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => onDelete?.(p)}>Delete</Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}