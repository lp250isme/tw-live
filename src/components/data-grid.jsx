import DataCard from './data-card'

export default function DataGrid({ source, items, onCardClick }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <DataCard key={item.id} source={source} item={item} onClick={onCardClick} />
      ))}
    </div>
  )
}
