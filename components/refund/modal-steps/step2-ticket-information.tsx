"use client"

import { Table, Input as AntInput, Tooltip } from "antd"
import { Controller, useFormContext } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Step2TicketInformationProps {
  onNext: (data: any) => void
}

export function Step2TicketInformation({ onNext }: Step2TicketInformationProps) {
  const { control, watch, formState: { errors } } = useFormContext()
  const tickets = watch("tickets") || []

  const columns = [
    { title: "SL.", key: "sl", width: 50, render: (_: any, __: any, index: number) => index + 1 },
    { title: "Ticket No.", dataIndex: "ticketNo", key: "ticketNo" },
    { title: "Pax Name", dataIndex: "paxName", key: "paxName" },
    { title: "PNR", dataIndex: "pnr", key: "pnr" },
    { title: "Route", dataIndex: "route", key: "route" },
    { title: "Profit", dataIndex: "profit", key: "profit", render: (val: number) => <span className="text-green-600 font-medium">{val}</span> },
    { title: "Sell Price", dataIndex: "sellPrice", key: "sellPrice" },
    { title: "Discount", dataIndex: "discount", key: "discount" },
    {
      title: "Refund Charge From Client",
      key: "refundChargeFromClient",
      render: (_: any, __: any, index: number) => {
        const error = (errors.tickets as any)?.[index]?.refundChargeFromClient;
        return (
          <Controller
            name={`tickets.${index}.refundChargeFromClient`}
            control={control}
            render={({ field }) => (
              <Tooltip title={error?.message} open={!!error}>
                <AntInput
                  type="number"
                  {...field}
                  onChange={e => field.onChange(Number(e.target.value))}
                  className={cn("w-full", error && "border-red-500 bg-red-50")}
                  status={error ? "error" : undefined}
                />
              </Tooltip>
            )}
          />
        )
      }
    },
    { title: "Vendor", dataIndex: "vendorName", key: "vendorName" },
    { title: "Airline", dataIndex: "airline", key: "airline" },
    { title: "Purchase Price", dataIndex: "purchasePrice", key: "purchasePrice" },
    {
      title: "Refund Charge Taken By Vendor",
      key: "refundChargeTakenByVendor",
      render: (_: any, __: any, index: number) => {
        const error = (errors.tickets as any)?.[index]?.refundChargeTakenByVendor;
        return (
          <Controller
            name={`tickets.${index}.refundChargeTakenByVendor`}
            control={control}
            render={({ field }) => (
              <Tooltip title={error?.message} open={!!error}>
                <AntInput
                  type="number"
                  {...field}
                  onChange={e => field.onChange(Number(e.target.value))}
                  className={cn("w-full", error && "border-red-500 bg-red-50")}
                  status={error ? "error" : undefined}
                />
              </Tooltip>
            )}
          />
        )
      }
    },
  ]

  return (
    <div className="space-y-6">
      <div className="border-b pb-2">
        <h3 className="text-sm font-semibold text-gray-700">AirTicket Information</h3>
      </div>
      <div className="overflow-x-auto">
        <Table
          columns={columns}
          dataSource={tickets}
          pagination={false}
          rowKey="id"
          size="small"
          bordered
        />
      </div>
      <div className="flex justify-end gap-4 items-center">
        <Button onClick={onNext} className="bg-[#00AEEF] hover:bg-[#008ECC]">
          Submit
        </Button>
      </div>
    </div>
  )
}
