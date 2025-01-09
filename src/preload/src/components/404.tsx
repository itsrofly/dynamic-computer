import { Link } from "react-router-dom"

function NotFound(): JSX.Element {

    return (
        <>
            <div className="text-white text-center mt-5">
                <Link className="me-2" to="/">
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5FB2FF"><path d="M400-80 0-480l400-400 71 71-329 329 329 329-71 71Z" /></svg>
                </Link>
                <span>404 Not Found</span>
            </div>
        </>
    )
}

export default NotFound
