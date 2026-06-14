// Vercel Cron Job: Annahme-Mails senden
export default async function handler(req, res) {
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const filter = encodeURIComponent('AND({Status} = "Angenommen", NOT({Annahme-gesendet}))');
    const atRes = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Bewerbungen?filterByFormula=${filter}`,
      { headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` } }
    );
    if (!atRes.ok) return res.status(500).json({ error: 'Airtable Fehler' });
    const data = await atRes.json();
    const records = data.records || [];
    let sent = 0;
    for (const record of records) {
      const { Name, 'E-Mail': email, Format } = record.fields;
      if (!email) continue;
      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: 2, to: [{ name: Name, email }], replyTo: { name: 'Boogly Studio', email: 'hallo@boogly.studio' }, params: { name: Name, format: Format, email } }),
      });
      if (!brevoRes.ok) { console.error('Brevo Fehler für', email); continue; }
      await fetch(
        `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Bewerbungen/${record.id}`,
        { method: 'PATCH', headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { 'Annahme-gesendet': true } }) }
      );
      sent++;
    }
    return res.status(200).json({ checked: records.length, sent });
  } catch (err) {
    return res.status(500).json({ error: 'Serverfehler' });
  }
}
