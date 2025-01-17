import { ipcRenderer } from 'electron'

function CardCreate(): JSX.Element {
  return (
    <>
      <div>
        <button
          className="border-2 m-auto rounded bg-transparent"
          onClick={async () => {
            await ipcRenderer.invoke('projects:create')
          }}
          style={{ height: '150px', width: '220px', borderColor: '#5FB2FF' }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            height="24px"
            viewBox="0 -960 960 960"
            width="24px"
            fill="#5FB2FF"
          >
            <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z" />
          </svg>
        </button>
      </div>
    </>
  )
}

export default CardCreate
