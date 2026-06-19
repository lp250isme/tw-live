import DataRow from './data-row'

// Dense list: one row per station, two columns on wide screens. Replaces the
// gauge-card grid so many readings are scannable at once.
export default function DataList({ source, items, onCardClick }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
      {items.map((item) => (
        <DataRow key={item.id} source={source} item={item} onClick={onCardClick} />
      ))}
    </div>
  )
}
