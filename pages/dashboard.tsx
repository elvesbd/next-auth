import { useContext, useEffect } from "react"
import { AuthContext } from "../contexts/AuthContext"
import { api } from "../services/api"

export default function DashBoard() {
  const { user } = useContext(AuthContext)

  useEffect(() => {
    api.get('/me')
      .then((response => console.log(response)))
      .catch(error => console.error(error))
  }, [])

  return (
    <h1>DashBoard: {user?.email}</h1>
  )
}