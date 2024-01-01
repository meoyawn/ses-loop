import { type Content, SendEmailCommand, SESClient } from "@aws-sdk/client-ses"
import { access, readFile, writeFile } from "fs/promises"
import { load } from "js-yaml"
import { join } from "path"

interface Cfg {
  region: string
  access_key_id: string
  access_key_secret: string
  emails: ReadonlyArray<string>
  from: string
  subject: string
  plain: string
}

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

const utf8 = (Data: string): Content => ({ Charset: "UTF-8", Data })

const mkEmail = ({
  to,
  from,
  subject,
  htmlBody,
  textBody,
}: {
  to: string
  from: string
  subject: string
  htmlBody?: string
  textBody: string
}): SendEmailCommand =>
  new SendEmailCommand({
    Destination: { ToAddresses: [to] },
    Message: {
      Body: {
        Html: htmlBody ? utf8(htmlBody) : undefined,
        Text: utf8(textBody),
      },
      Subject: utf8(subject),
    },
    Source: from,
  })

const config = load(await readFile(process.argv[2], "utf-8")) as Cfg

const sesClient = new SESClient({
  region: config.region,
  credentials: {
    accessKeyId: config.access_key_id,
    secretAccessKey: config.access_key_secret,
  },
})

for (const email of config.emails) {
  const sent = join("sent", config.subject, `${email}.txt`)
  if (await exists(sent)) continue

  await sesClient.send(
    mkEmail({
      from: config.from,
      to: email,
      subject: config.subject,
      textBody: config.plain,
    }),
  )
  await writeFile(sent, "")
}
