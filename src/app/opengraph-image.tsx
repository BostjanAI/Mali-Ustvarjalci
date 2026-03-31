import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Mali Ustvarjalci - Creative Products for Children';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 64,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 'bold',
          padding: '40px',
        }}
      >
        <div style={{ fontSize: 96, marginBottom: 20 }}>Mali Ustvarjalci</div>
        <div style={{ fontSize: 36, fontWeight: 'normal', opacity: 0.9 }}>
          Creative Products for Children
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
