import { useNavigate } from 'react-router-dom'
import { Box, Button, Input, VStack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { useUser, validateCredentials } from '../context/UserContext'

export default function Login() {
  const [matricule, setMat] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setMatricule } = useUser()

  const handleLogin = () => {
    if (!matricule.trim() || !password.trim()) {
      setError("Veuillez remplir tous les champs.")
      return
    }

    setLoading(true)
    setError("")

    // Validation des identifiants
    const validation = validateCredentials(matricule.trim(), password)
    
    if (validation.isValid) {
      setMatricule(matricule.trim())
      navigate("/dashboard")
    } else {
      setError(validation.error)
    }
    
    setLoading(false)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin()
    }
  } } from 'react-router-dom'
import { Box, Button, Input, VStack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { useUser } from '../context/UserContext'

export default function Login() {
  const [matricule, setMat] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const navigate = useNavigate()
  const { setMatricule } = useUser()

  const handleLogin = () => {
    if (matricule && password) {
      setMatricule(matricule)
      navigate("/dashboard")
    } else {
      setError("Êtes-vous sûr de votre saisie ? L’un des champs comporte une erreur.")
    }
  }

  return (
    <Box h="100vh" bg="#2b2b2b" display="flex" alignItems="center" justifyContent="center">
      <VStack spacing={4} bg="white" p={8} borderRadius="lg" shadow="lg" minW="360px">
        <Text fontSize="2xl" fontWeight="bold">Connexion Intranet</Text>
        {error && <Text color="red.500" textAlign="center">{error}</Text>}
        <Input placeholder="Matricule" value={matricule} onChange={e => setMat(e.target.value)} />
        <Input placeholder="Mot de passe" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <Button colorScheme="blue" w="full" onClick={handleLogin}>Se connecter</Button>
      </VStack>
    </Box>
  )
}
