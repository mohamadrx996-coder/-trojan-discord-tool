import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // السماح بطلبات POST فقط
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // كود بسيط للتأكد من أن السيرفر يستجيب
    return res.status(200).json({ 
      success: true, 
      status: "online",
      message: "تم الاتصال بنجاح" 
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal Error", message: error.message });
  }
}
