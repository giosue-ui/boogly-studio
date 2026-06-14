export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://boogly.studio');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    name, email, instagram, tiktok, youtube,
    format, bio, motivation, themen, website
  } = req.body;

  // Honeypot: Bot hat das versteckte Feld ausgefüllt
  if (website) return res.status(200).json({ ok: true });

  // Pflichtfelder prüfen
  if (!name || !email || !instagram || !format || !bio || !motivation || !themen) {
    return res.status(400).json({ error: 'Fehlende Pflichtfelder' });
  }

  try {
    // 1. Airtable: Datensatz anlegen
    const atRes = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Bewerbungen`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            Name: name,
            'E-Mail': email,
            Instagram: instagram,
            TikTok: tiktok || '',
            YouTube: youtube || '',
            Format: format,
            Vorstellung: bio,
            Motivation: motivation,
            Themen: themen,
            Bewerbungsdatum: new Date().toISOString().split('T')[0],
            Status: 'Neu',
          },
        }),
      }
    );

    if (!atRes.ok) {
      const err = await atRes.text();
      console.error('Airtable Fehler:', err);
      return res.status(500).json({ error: 'Airtable fehlgeschlagen' });
    }

    // 2. Brevo: Bestätigungsmail senden (Template #1 = Anmeldebestätigung)
    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        templateId: 1,
        to: [{ name, email }],
        replyTo: { name: 'Boogly Studio', email: 'hallo@boogly.studio' },
        params: { name, format, email },
      }),
    });

    if (!brevoRes.ok) {
      const err = await brevoRes.text();
      console.error('Brevo Fehler:', err);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Unerwarteter Fehler:', err);
    return res.status(500).json({ error: 'Serverfehler' });
  }
}
