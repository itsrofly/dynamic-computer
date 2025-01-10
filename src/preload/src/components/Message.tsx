function MessageCard({ message }: { message: string }): JSX.Element {
  return (
    <>
      <div
        className="text-black d-flex align-items-center rounded shadow p-3"
        style={{
          backgroundColor: 'white',
          minHeight: '50px',
          minWidth: '100px',
          maxWidth: '500px'
        }}
      >
        <span className="text-break">{message}</span>
      </div>
    </>
  )
}

export default MessageCard
