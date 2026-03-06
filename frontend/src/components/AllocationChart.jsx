import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

const COLORS = ['#c44569', '#5b8dee', '#2ecc71', '#f39c12', '#9b59b6', '#e67e22']

const fmtY = (v) => {
  if (v >= 1000000) return `S$${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `S$${(v / 1000).toFixed(0)}k`
  return `S$${v}`
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const { assetClass, valueSgd, weight } = payload[0].payload
  return (
    <div style={{
      background: '#1a1d26', border: '1px solid #23262f',
      borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#e2e4ea'
    }}>
      <strong>{assetClass}</strong>
      <div>S$ {valueSgd.toLocaleString('en-SG', { maximumFractionDigits: 0 })}</div>
      <div style={{ color: '#555b6e' }}>{(weight * 100).toFixed(1)}% of portfolio</div>
    </div>
  )
}

export default function AllocationChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
        <XAxis dataKey="assetClass" tick={{ fontSize: 12, fill: '#8b92a5' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#8b92a5' }} tickFormatter={fmtY} axisLine={false} tickLine={false} width={60} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="valueSgd" radius={[5, 5, 0, 0]} maxBarSize={60}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
