export interface InvoiceRow {
    invoiceNumber: string;
    customerName: string;
    customerEmail: string;
    amountDue: number;
    dueDate: string;
    status: string;
}

export interface ClientInvoices {
    clientId: string;
    fileName: string;
    invoices: InvoiceRow[];
}
