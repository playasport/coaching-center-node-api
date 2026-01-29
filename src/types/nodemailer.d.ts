declare module 'nodemailer' {
  interface AuthOptions {
    user: string;
    pass: string;
  }

  interface CreateTransportOptions {
    host: string;
    port: number;
    secure?: boolean;
    auth?: AuthOptions;
  }

  interface Attachment {
    filename: string;
    content: Buffer;
    contentType?: string;
  }

  interface SendMailOptions {
    from?: string;
    to: string;
    subject: string;
    html?: string;
    text?: string;
    attachments?: Attachment[];
  }

  interface Transporter {
    sendMail(options: SendMailOptions): Promise<any>;
  }

  function createTransport(options: CreateTransportOptions): Transporter;

  const nodemailer: {
    createTransport: typeof createTransport;
  };

  export { createTransport, Transporter, SendMailOptions, CreateTransportOptions };
  export default nodemailer;
}



