import { useNavigate } from 'react-router-dom';
import { Box, Button, Input, VStack, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { useUser } from '../context/UserContext';
import { login } from '../api/auth';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPwd] = useState('');
  const [error, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setToken, setUser } = useUser();

  const submit = async () => {
    if (!username.trim() || !password.trim()) {
      setErr('Champs requis.');
      return;
    }
    setLoading(true);
    setErr('');
    try {
      const data = await login(username.trim().toLowerCase(), password);
      setToken(data.token);
      setUser(data.user);
      navigate('/dashboard');
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const key = (e) => e.key === 'Enter' && submit();

  return (
    <Box h="100vh" bg="#2b2b2b" display="flex" alignItems="center" justifyContent="center">
      <VStack spacing={4} bg="white" p={8} borderRadius="lg" shadow="lg" minW="360px">
        <Text fontSize="2xl" fontWeight="bold">Connexion Intranet</Text>
        {error && <Text color="red.500" textAlign="center">{error}</Text>}
        <Input
          placeholder="Identifiant"
          value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={key}
        />
        <Input
          placeholder="Mot de passe"
          type="password"
          value={password}
          onChange={e => setPwd(e.target.value)}
          onKeyDown={key}
        />
        <Button
          colorScheme="blue"
          w="full"
          onClick={submit}
          isLoading={loading}
          loadingText="Connexion..."
        >
          Se connecter
        </Button>
      </VStack>
    </Box>
  );
}
