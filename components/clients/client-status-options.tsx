"use client"

type ClientStatusOption = {
  value: string
  label: string
}

type ClientStatusOptionsProps = {
  clientType: string
}

export function getClientStatusOptions({ clientType }: ClientStatusOptionsProps): ClientStatusOption[] {
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
      return []
  }
}