import { GenericTransportOptions, Transport, TransportInstance, log, transports } from 'winston'
import { SendMailOptions, Transporter, createTransport } from 'nodemailer'

import { SmtpOptions } from 'nodemailer-smtp-transport'

export interface IWinstonNodemailerOptions extends GenericTransportOptions, SendMailOptions, SmtpOptions {
  debounce?: number
  timestamp?: Function
}

export class WinstonNodemailer extends Transport implements TransportInstance {
  private debounce: number
  private messageBuffer: string[]
  private timestamp: Function
  private transporter: Transporter
  private triggered: NodeJS.Timer

  constructor(private options: IWinstonNodemailerOptions) {
    super()

    this.level = options.level || 'error'
    this.name = 'nodemailer'

    this.debounce = options.debounce || 60000
    this.timestamp = options.timestamp || (() => (new Date()).toISOString())

    this.messageBuffer = []

    this.transporter = createTransport(options)
  }

  public log(level: string, msg: string, meta: object, callback: Function) {
    if (this.silent) {
      return callback(null, true)
    }

    this.messageBuffer.push(`${this.timestamp()} - ${msg}\n${JSON.stringify(meta, null, 4)}\n\n`)

    if (!this.triggered) {
      this.triggered = setTimeout(() => {
        this.sendMail(callback)
      }, this.debounce)
    }
  }

  private sendMail(callback: Function) {
    this.transporter
      .sendMail(Object.assign(this.options, {
        text: this.messageBuffer.join(''),
      }))
      .then((res) => {
        this.emit('logged')
        callback(null, true)
      })
      .catch((err) => {
        this.emit('error', err)
      })

    this.messageBuffer = []
    delete this.triggered
  }
}
