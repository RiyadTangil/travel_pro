import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface RecentClient {
  id: string;
  name: string;
  destination: string;
  clientType: string;
  registrationDate: string;
  status: string;
  contractAmount: number;
}

interface RecentClientsProps {
  recentClients: RecentClient[];
}

export function RecentClients({ recentClients }: RecentClientsProps) {

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      "file-ready": "bg-blue-100 text-blue-800",
      medical: "bg-purple-100 text-purple-800",
      mofa: "bg-yellow-100 text-yellow-800",
      "visa-stamping": "bg-indigo-100 text-indigo-800",
      fingerprint: "bg-pink-100 text-pink-800",
      manpower: "bg-orange-100 text-orange-800",
      "flight-ticket": "bg-green-100 text-green-800",
      completed: "bg-green-100 text-green-800",
    }

    const statusLabels = {
      "file-ready": "File Ready",
      medical: "Medical",
      mofa: "MOFA",
      "visa-stamping": "Visa Stamping",
      fingerprint: "Fingerprint",
      manpower: "Manpower",
      "flight-ticket": "Flight/Ticket",
      completed: "Completed",
    }

    return (
      <Badge className={statusStyles[status] || "bg-gray-100 text-gray-800"}>{statusLabels[status] || status}</Badge>
    )
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  }

  const getClientTypeLabel = (clientType: string) => {
    switch (clientType) {
      case "saudi-kuwait":
        return "Saudi & Kuwait";
      case "other-countries":
        return "Other Countries";
      case "omra-visa":
        return "Omra Visa (Saudi)";
      default:
        return clientType;
    }
  }

  if (recentClients.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No recent clients found.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Destination</TableHead>
          <TableHead>Client Type</TableHead>
          <TableHead>Registration Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Contract Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {recentClients.map((client) => (
          <TableRow key={client.id}>
            <TableCell className="font-medium">{client.name}</TableCell>
            <TableCell>{client.destination}</TableCell>
            <TableCell>{getClientTypeLabel(client.clientType)}</TableCell>
            <TableCell>{formatDate(client.registrationDate)}</TableCell>
            <TableCell>{getStatusBadge(client.status)}</TableCell>
            <TableCell>BDT {client.contractAmount.toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
