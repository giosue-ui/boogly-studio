export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');

  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Castings?filterByFormula=%7BAktiv%7D%3D1&sort%5B0%5D%5Bfield%5D=Reihenfolge&sort%5B0%5D%5Bdirection%5D=asc`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Airtable error: ' + response.status);

    const data = await response.json();
    const castings = data.records.map(r => r.fields.Name).filter(Boolean);

    res.status(200).json({ castings });
  } catch (err) {
    res.status(200).json({ castings: [], error: err.message });
  }
}
