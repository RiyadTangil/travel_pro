"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";

interface FlightItem {
  id: string;
  clientName: string;
  ticketNo: string;
  airline: string;
  journeyDate: string;
}

interface FlightScheduleProps {
  data?: FlightItem[];
  isLoading: boolean;
}

export function FlightSchedule({ data: flights = [], isLoading }: FlightScheduleProps) {
  return (
    <Card className="w-full relative min-h-[300px]">
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-xl">
          <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
        </div>
      )}
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium">Flight Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-xs font-medium text-gray-600">Client Name</TableHead>
                <TableHead className="text-xs font-medium text-gray-600">Ticket No</TableHead>
                <TableHead className="text-xs font-medium text-gray-600">Airline</TableHead>
                <TableHead className="text-xs font-medium text-gray-600">Journey Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flights.length > 0 ? (
                flights.map((flight) => (
                  <TableRow key={flight.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="text-sm font-medium text-gray-700">{flight.clientName}</TableCell>
                    <TableCell className="text-sm text-sky-600 font-semibold">{flight.ticketNo}</TableCell>
                    <TableCell className="text-sm text-gray-600">{flight.airline}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {flight.journeyDate ? format(parseISO(flight.journeyDate), "dd MMM yyyy") : "—"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-gray-500 italic">
                    {isLoading ? "Fetching flights..." : "No upcoming flights found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}