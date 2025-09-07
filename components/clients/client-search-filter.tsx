import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"

interface ClientSearchFilterProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  clientType?: "saudi-kuwait" | "other-countries" | "omra-visa"
}

const getStatusesForClientType = (clientType: string) => {
  switch (clientType) {
    case "saudi-kuwait":
      return [
        { value: "file-ready", label: "File Ready" },
        { value: "medical", label: "Medical" },
        { value: "mofa", label: "MOFA" },
        { value: "visa-stamping", label: "Visa Stamping" },
        { value: "manpower", label: "Manpower" },
        { value: "flight-ticket", label: "Flight/Ticket" },
        { value: "completed", label: "Completed" },
      ]
    case "other-countries":
      return [
        { value: "manpower", label: "Manpower" },
        { value: "flight-ticket", label: "Flight/Ticket" },
        { value: "completed", label: "Completed" },
      ]
    case "omra-visa":
      return [
        { value: "file-ready", label: "File Ready" },
        { value: "fingerprint", label: "Fingerprint" },
        { value: "flight-ticket", label: "Flight/Ticket" },
        { value: "completed", label: "Completed" },
      ]
    default:
      return [
        { value: "file-ready", label: "File Ready" },
        { value: "medical", label: "Medical" },
        { value: "mofa", label: "MOFA" },
        { value: "visa-stamping", label: "Visa Stamping" },
        { value: "fingerprint", label: "Fingerprint" },
        { value: "manpower", label: "Manpower" },
        { value: "flight-ticket", label: "Flight/Ticket" },
        { value: "completed", label: "Completed" },
      ]
  }
}

export function ClientSearchFilter({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  clientType
}: ClientSearchFilterProps) {
  const statuses = getStatusesForClientType(clientType || "")

  return (
    <div className="flex gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search by name, passport, or email..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {statuses.map((status) => (
            <SelectItem key={status.value} value={status.value}>
              {status.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}