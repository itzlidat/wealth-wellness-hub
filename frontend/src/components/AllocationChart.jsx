import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

const COLORS = ['#0052cc', '#00b8d9', '#36b37e', '#ff5630', '#6554c0', '#ff991f']

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
      background: '#fff', border: '1px solid #e0e4ea',
      borderRadius: 8, padding: '10px 14px', fontSize: 13
    }}>
      <strong>{assetClass}</strong>
      <div>S$ {valueSgd.toLocaleString('en-SG', { maximumFractionDigits: 0 })}</div>
      <div style={{ color: '#aaa' }}>{(weight * 100).toFixed(1)}% of portfolio</div>
    </div>
  )
}

export default function AllocationChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
        <XAxis dataKey="assetClass" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtY} axisLine={false} tickLine={false} width={60} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
        <Bar dataKey="valueSgd" radius={[5, 5, 0, 0]} maxBarSize={60}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
