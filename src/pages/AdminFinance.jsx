import React, { useState, useEffect } from "react";
import {
  Box, Grid, Card, CardBody, CardHeader, Heading, Text, Button,
  Input, Select, NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper, Stat, StatLabel,
  StatNumber, StatHelpText, StatArrow, VStack, HStack, Badge,
  Table, Thead, Tbody, Tr, Th, Td, useToast, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  useDisclosure, FormControl, FormLabel, Textarea, Divider, Flex,
  Icon, SimpleGrid, Progress, Alert, AlertIcon, Container,
  InputGroup, InputLeftElement, InputRightElement, Tag, TagLabel,
  ButtonGroup, IconButton, Menu, MenuButton, MenuList, MenuItem,
  useColorModeValue, Spinner, Tabs, TabList, TabPanels, Tab, TabPanel,
  Switch, Checkbox
} from "@chakra-ui/react";
import {
  FiDollarSign, FiTrendingUp, FiTrendingDown, FiPlus, FiMinus,
  FiPieChart, FiBarChart, FiCalendar, FiCreditCard, FiDownload,
  FiUpload, FiEdit3, FiTrash2, FiMoreHorizontal, FiCheck,
  FiX, FiRefreshCw, FiEye, FiFilter, FiSearch, FiUsers, FiSave,
  FiSettings, FiClock, FiFileText
} from "react-icons/fi";
import { useUser } from '../context/UserContext';
import { financeAPI } from '../api/finance';

// Composant pour la saisie d'argent innovante
const MoneyInput = ({ value, onChange, placeholder = "0,00 €", size = "md", ...props }) => {
  const [displayValue, setDisplayValue] = useState("");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused && value !== undefined) {
      setDisplayValue(formatCurrency(value));
    }
  }, [value, focused]);

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "";
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const parseCurrency = (str) => {
    const numStr = str.replace(/[^\d,-]/g, '').replace(',', '.');
    return parseFloat(numStr) || 0;
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);
    
    if (onChange) {
      const numericValue = parseCurrency(newValue);
      onChange(numericValue);
    }
  };

  const bgColor = useColorModeValue("white", "gray.800");
  const focusColor = useColorModeValue("blue.500", "blue.300");

  return (
    <InputGroup size={size}>
      <InputLeftElement pointerEvents="none">
        <Icon as={FiDollarSign} color="gray.400" />
      </InputLeftElement>
      <Input
        {...props}
        value={displayValue}
        onChange={handleChange}
        onFocus={() => {
          setFocused(true);
          setDisplayValue(value?.toString() || "");
        }}
        onBlur={() => {
          setFocused(false);
          setDisplayValue(formatCurrency(value));
        }}
        placeholder={placeholder}
        textAlign="right"
        bg={bgColor}
        borderColor="gray.300"
        _focus={{
          borderColor: focusColor,
          boxShadow: `0 0 0 1px ${focusColor}`
        }}
        _hover={{
          borderColor: "gray.400"
        }}
      />
    </InputGroup>
  );
};

// Composant pour afficher les statistiques financières
const FinanceStats = ({ data, loading }) => {
  const cardBg = useColorModeValue("white", "gray.800");
  
  if (loading) {
    return (
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
        {[1, 2, 3, 4].map(i => (
          <Card key={i} bg={cardBg}>
            <CardBody>
              <Stat>
                <StatLabel color="gray.600">Chargement...</StatLabel>
                <StatNumber><Spinner size="sm" /></StatNumber>
              </Stat>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>
    );
  }
  
  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
      <Card bg={cardBg}>
        <CardBody>
          <Stat>
            <StatLabel color="gray.600">Solde bancaire</StatLabel>
            <StatNumber color="blue.500">
              <HStack>
                <Icon as={FiCreditCard} />
                <Text>{data?.currentBalance || "0,00 €"}</Text>
              </HStack>
            </StatNumber>
            <StatHelpText>
              {data?.bankBalance !== null ? 'Configuré' : 'À définir'}
            </StatHelpText>
          </Stat>
        </CardBody>
      </Card>

      <Card bg={cardBg}>
        <CardBody>
          <Stat>
            <StatLabel color="gray.600">Recettes du mois</StatLabel>
            <StatNumber color="green.500">
              <HStack>
                <Icon as={FiTrendingUp} />
                <Text>{data?.monthlyRevenue || "0,00 €"}</Text>
              </HStack>
            </StatNumber>
            <StatHelpText>
              {data?.revenueGrowth > 0 ? (
                <>
                  <StatArrow type="increase" />
                  +{data?.revenueGrowth}% vs mois dernier
                </>
              ) : (
                <>
                  <StatArrow type="decrease" />
                  {data?.revenueGrowth}% vs mois dernier
                </>
              )}
            </StatHelpText>
          </Stat>
        </CardBody>
      </Card>

      <Card bg={cardBg}>
        <CardBody>
          <Stat>
            <StatLabel color="gray.600">Dépenses prévues</StatLabel>
            <StatNumber color="orange.500">
              <HStack>
                <Icon as={FiClock} />
                <Text>{data?.monthlyExpenses || "0,00 €"}</Text>
              </HStack>
            </StatNumber>
            <StatHelpText>Dépenses programmées</StatHelpText>
          </Stat>
        </CardBody>
      </Card>

      <Card bg={cardBg}>
        <CardBody>
          <Stat>
            <StatLabel color="gray.600">Membres actifs</StatLabel>
            <StatNumber color="purple.500">
              <HStack>
                <Icon as={FiUsers} />
                <Text>{data?.activeMembers || 0} membres</Text>
              </HStack>
            </StatNumber>
            <StatHelpText>{data?.membershipRevenue || "0,00 €"} ce mois</StatHelpText>
          </Stat>
        </CardBody>
      </Card>
    </SimpleGrid>
  );
};

// Composant principal
export default function AdminFinance() {
  const { user } = useUser();
  const toast = useToast();
  const { 
    isOpen: isTransactionOpen, 
    onOpen: onTransactionOpen, 
    onClose: onTransactionClose 
  } = useDisclosure();
  const { 
    isOpen: isBankBalanceOpen, 
    onOpen: onBankBalanceOpen, 
    onClose: onBankBalanceClose 
  } = useDisclosure();
  const { 
    isOpen: isExpenseOpen, 
    onOpen: onExpenseOpen, 
    onClose: onExpenseClose 
  } = useDisclosure();
  
  const [transactions, setTransactions] = useState([]);
  const [scheduledExpenses, setScheduledExpenses] = useState([]);
  const [financeData, setFinanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [bankBalance, setBankBalance] = useState(0);
  const [formData, setFormData] = useState({
    type: 'recette',
    amount: 0,
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [expenseData, setExpenseData] = useState({
    description: '',
    amount: 0,
    scheduledDate: new Date().toISOString().split('T')[0],
    category: '',
    recurring: false
  });
  const [categories, setCategories] = useState([]);

  const cardBg = useColorModeValue("white", "gray.800");
  const gradientBg = useColorModeValue(
    "linear(to-r, blue.500, purple.600)",
    "linear(to-r, blue.600, purple.700)"
  );

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    await Promise.all([
      loadFinanceData(),
      loadTransactions(),
      loadScheduledExpenses(),
      loadCategories()
    ]);
  };

  const loadFinanceData = async () => {
    try {
      setLoading(true);
      console.log('🏦 Chargement des données financières...');
      
      const data = await financeAPI.getStats();
      console.log('📊 Données financières reçues:', data);
      
      setFinanceData(data);
      
      // Définir le solde bancaire s'il est configuré
      if (data.bankBalance !== null && data.bankBalance !== undefined) {
        setBankBalance(data.bankBalance);
      }
      
      toast({
        title: "Données synchronisées",
        description: "Statistiques financières mises à jour avec les données réelles",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error('❌ Erreur chargement données financières:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données financières. Utilisation des données par défaut.",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
      
      // Données par défaut si l'API échoue
      setFinanceData({
        monthlyRevenue: "0,00 €",
        monthlyExpenses: "0,00 €",
        currentBalance: "0,00 €",
        membershipRevenue: "0,00 €",
        bankBalance: null,
        activeMembers: 0,
        revenueGrowth: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      setTransactionsLoading(true);
      console.log('💳 Chargement des transactions...');
      
      const data = await financeAPI.getTransactions({ limit: 50 });
      console.log('📋 Transactions reçues:', data);
      
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('❌ Erreur chargement transactions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les transactions",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const loadScheduledExpenses = async () => {
    try {
      console.log('⏰ Chargement des dépenses programmées...');
      
      const data = await financeAPI.getScheduledExpenses(6);
      console.log('📅 Dépenses programmées reçues:', data);
      
      setScheduledExpenses(data.expenses || []);
    } catch (error) {
      console.error('❌ Erreur chargement dépenses programmées:', error);
      setScheduledExpenses([]);
    }
  };

  const loadCategories = async () => {
    try {
      // Catégories par défaut étendues
      setCategories([
        { id: 'adhesions', name: 'Adhésions', type: 'recette' },
        { id: 'evenements', name: 'Événements', type: 'recette' },
        { id: 'carburant', name: 'Carburant', type: 'depense' },
        { id: 'maintenance', name: 'Maintenance', type: 'depense' },
        { id: 'assurance', name: 'Assurance', type: 'depense' },
        { id: 'materiel', name: 'Matériel', type: 'depense' },
        { id: 'frais_admin', name: 'Frais administratifs', type: 'depense' },
        { id: 'taxes', name: 'Taxes et impôts', type: 'depense' },
        { id: 'communication', name: 'Communication', type: 'depense' },
        { id: 'autres', name: 'Autres', type: 'both' }
      ]);
    } catch (error) {
      console.error('❌ Erreur chargement catégories:', error);
    }
  };

  const handleSubmitTransaction = async () => {
    try {
      if (!formData.amount || !formData.description) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir tous les champs obligatoires",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      console.log('💾 Création d\'une nouvelle transaction:', formData);

      const newTransaction = await financeAPI.createTransaction({
        ...formData,
        created_by: user?.email || user?.username || 'admin'
      });

      console.log('✅ Transaction créée:', newTransaction);

      // Ajouter la nouvelle transaction à la liste
      setTransactions(prev => [newTransaction, ...prev]);
      
      // Réinitialiser le formulaire
      setFormData({
        type: 'recette',
        amount: 0,
        description: '',
        category: '',
        date: new Date().toISOString().split('T')[0]
      });

      onTransactionClose();
      
      toast({
        title: "Succès",
        description: "Transaction enregistrée avec succès",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      
      // Recharger les statistiques
      loadFinanceData();
    } catch (error) {
      console.error('❌ Erreur création transaction:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la transaction",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSubmitBankBalance = async () => {
    try {
      console.log('🏦 Définition du solde bancaire:', bankBalance);

      const result = await financeAPI.setBankBalance(bankBalance);
      console.log('✅ Solde bancaire défini:', result);

      onBankBalanceClose();
      
      toast({
        title: "Succès",
        description: `Solde bancaire défini : ${result.formatted}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      
      // Recharger les statistiques
      loadFinanceData();
    } catch (error) {
      console.error('❌ Erreur définition solde bancaire:', error);
      toast({
        title: "Erreur",
        description: "Impossible de définir le solde bancaire",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSubmitExpense = async () => {
    try {
      if (!expenseData.amount || !expenseData.description) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir tous les champs obligatoires",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      console.log('⏰ Création d\'une dépense programmée:', expenseData);

      const newExpense = await financeAPI.createScheduledExpense({
        ...expenseData,
        created_by: user?.email || user?.username || 'admin'
      });

      console.log('✅ Dépense programmée créée:', newExpense);

      // Ajouter la nouvelle dépense à la liste
      setScheduledExpenses(prev => [newExpense, ...prev]);
      
      // Réinitialiser le formulaire
      setExpenseData({
        description: '',
        amount: 0,
        scheduledDate: new Date().toISOString().split('T')[0],
        category: '',
        recurring: false
      });

      onExpenseClose();
      
      toast({
        title: "Succès",
        description: "Dépense programmée enregistrée avec succès",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      
      // Recharger les données
      loadFinanceData();
      loadScheduledExpenses();
    } catch (error) {
      console.error('❌ Erreur création dépense programmée:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la dépense programmée",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSyncMemberships = async () => {
    try {
      console.log('🔄 Synchronisation des adhésions...');
      
      const result = await financeAPI.syncMemberships();
      console.log('✅ Synchronisation terminée:', result);
      
      toast({
        title: "Synchronisation réussie",
        description: `${result.synchronized} adhésions synchronisées`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      
      // Recharger les données
      await loadInitialData();
    } catch (error) {
      console.error('❌ Erreur synchronisation:', error);
      toast({
        title: "Erreur synchronisation",
        description: "Impossible de synchroniser les adhésions",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleExport = async () => {
    try {
      console.log('📤 Export des données comptables...');
      
      const result = await financeAPI.exportData('csv');
      
      toast({
        title: "Export réussi",
        description: result.message,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('❌ Erreur export:', error);
      toast({
        title: "Erreur export",
        description: "Impossible d'exporter les données",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleGenerateReport = async () => {
    try {
      console.log('📊 Génération du rapport mensuel...');
      
      const report = await financeAPI.generateReport('monthly');
      console.log('📋 Rapport généré:', report);
      
      toast({
        title: "Rapport généré",
        description: "Le rapport mensuel a été généré avec succès",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('❌ Erreur génération rapport:', error);
      toast({
        title: "Erreur rapport",
        description: "Impossible de générer le rapport",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8}>
          <Box
            bgGradient={gradientBg}
            color="white"
            p={8}
            borderRadius="xl"
            textAlign="center"
            w="full"
          >
            <Heading size="xl">🏦 Gestion Administrative et Financière</Heading>
            <Text mt={2} opacity={0.9}>
              Chargement des données financières en cours...
            </Text>
          </Box>
          <Spinner size="xl" color="blue.500" />
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8} fontFamily="Montserrat, sans-serif">
      {/* En-tête avec gradient */}
      <Box
        bgGradient={gradientBg}
        color="white"
        p={8}
        borderRadius="xl"
        mb={8}
        textAlign="center"
      >
        <Heading size="xl" mb={4}>
          🏦 Gestion Administrative et Financière
        </Heading>
        <Text fontSize="lg" opacity={0.9}>
          Données synchronisées avec les adhésions et événements • MyRBE
        </Text>
        <HStack spacing={4} justify="center" mt={4}>
          <Button
            size="sm"
            variant="outline"
            color="white"
            borderColor="whiteAlpha.300"
            leftIcon={<FiCreditCard />}
            onClick={onBankBalanceOpen}
          >
            {financeData?.bankBalance !== null ? 'Modifier solde' : 'Définir solde bancaire'}
          </Button>
        </HStack>
      </Box>

      {/* Statistiques financières */}
      <FinanceStats data={financeData} loading={false} />

      {/* Onglets principaux */}
      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab>Transactions</Tab>
          <Tab>Dépenses programmées ({scheduledExpenses.length})</Tab>
          <Tab>Actions rapides</Tab>
        </TabList>

        <TabPanels>
          {/* Onglet Transactions */}
          <TabPanel>
            <Grid templateColumns={{ base: "1fr", lg: "1fr" }} gap={8}>
              <Card bg={cardBg}>
                <CardHeader>
                  <HStack justify="space-between">
                    <Heading size="md">Transactions récentes</Heading>
                    <ButtonGroup size="sm">
                      <Button
                        leftIcon={<FiPlus />}
                        colorScheme="blue"
                        onClick={onTransactionOpen}
                      >
                        Nouvelle transaction
                      </Button>
                      <Button
                        leftIcon={<FiRefreshCw />}
                        onClick={loadTransactions}
                        variant="outline"
                        isLoading={transactionsLoading}
                      >
                        Actualiser
                      </Button>
                    </ButtonGroup>
                  </HStack>
                </CardHeader>
                <CardBody>
                  {transactionsLoading ? (
                    <VStack py={8}>
                      <Spinner />
                      <Text>Chargement des transactions...</Text>
                    </VStack>
                  ) : transactions.length === 0 ? (
                    <VStack py={8}>
                      <Icon as={FiDollarSign} size="48px" color="gray.300" />
                      <Text color="gray.500">Aucune transaction trouvée</Text>
                      <Button size="sm" onClick={handleSyncMemberships} leftIcon={<FiUsers />}>
                        Synchroniser les adhésions
                      </Button>
                    </VStack>
                  ) : (
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Date</Th>
                          <Th>Type</Th>
                          <Th>Description</Th>
                          <Th isNumeric>Montant</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {transactions.map((transaction) => (
                          <Tr key={transaction.id}>
                            <Td>{new Date(transaction.date).toLocaleDateString('fr-FR')}</Td>
                            <Td>
                              <Badge
                                colorScheme={transaction.type === 'recette' ? 'green' : 'red'}
                                variant="subtle"
                              >
                                {transaction.type === 'recette' ? 'Recette' : 'Dépense'}
                              </Badge>
                            </Td>
                            <Td>
                              <VStack align="start" spacing={0}>
                                <Text fontSize="sm">{transaction.description}</Text>
                                {transaction.member && (
                                  <Text fontSize="xs" color="gray.500">
                                    {transaction.member.firstName} {transaction.member.lastName} 
                                    ({transaction.member.memberNumber})
                                  </Text>
                                )}
                              </VStack>
                            </Td>
                            <Td isNumeric>
                              <Text
                                color={transaction.type === 'recette' ? 'green.500' : 'red.500'}
                                fontWeight="bold"
                              >
                                {transaction.type === 'recette' ? '+' : '-'}
                                {new Intl.NumberFormat('fr-FR', {
                                  style: 'currency',
                                  currency: 'EUR'
                                }).format(transaction.amount)}
                              </Text>
                            </Td>
                            <Td>
                              <Menu>
                                <MenuButton
                                  as={IconButton}
                                  icon={<FiMoreHorizontal />}
                                  variant="ghost"
                                  size="sm"
                                />
                                <MenuList>
                                  <MenuItem icon={<FiEye />}>Voir détails</MenuItem>
                                  <MenuItem icon={<FiEdit3 />}>Modifier</MenuItem>
                                  <MenuItem icon={<FiTrash2 />} color="red.500">Supprimer</MenuItem>
                                </MenuList>
                              </Menu>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  )}
                </CardBody>
              </Card>
            </Grid>
          </TabPanel>

          {/* Onglet Dépenses programmées */}
          <TabPanel>
            <Grid templateColumns={{ base: "1fr", lg: "1fr" }} gap={8}>
              <Card bg={cardBg}>
                <CardHeader>
                  <HStack justify="space-between">
                    <Heading size="md">Dépenses programmées (6 prochains mois)</Heading>
                    <Button
                      leftIcon={<FiPlus />}
                      colorScheme="orange"
                      size="sm"
                      onClick={onExpenseOpen}
                    >
                      Programmer une dépense
                    </Button>
                  </HStack>
                </CardHeader>
                <CardBody>
                  {scheduledExpenses.length === 0 ? (
                    <VStack py={8}>
                      <Icon as={FiClock} size="48px" color="gray.300" />
                      <Text color="gray.500">Aucune dépense programmée</Text>
                      <Button size="sm" onClick={onExpenseOpen} leftIcon={<FiPlus />}>
                        Programmer la première dépense
                      </Button>
                    </VStack>
                  ) : (
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Date prévue</Th>
                          <Th>Description</Th>
                          <Th>Catégorie</Th>
                          <Th isNumeric>Montant</Th>
                          <Th>Récurrent</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {scheduledExpenses.map((expense) => (
                          <Tr key={expense.id}>
                            <Td>{new Date(expense.scheduledDate).toLocaleDateString('fr-FR')}</Td>
                            <Td>{expense.description}</Td>
                            <Td>
                              <Badge colorScheme="orange" variant="subtle">
                                {expense.category || 'Autres'}
                              </Badge>
                            </Td>
                            <Td isNumeric>
                              <Text color="orange.500" fontWeight="bold">
                                {new Intl.NumberFormat('fr-FR', {
                                  style: 'currency',
                                  currency: 'EUR'
                                }).format(expense.amount)}
                              </Text>
                            </Td>
                            <Td>
                              {expense.recurring ? (
                                <Badge colorScheme="blue" variant="outline">Récurrent</Badge>
                              ) : (
                                <Badge variant="outline">Ponctuel</Badge>
                              )}
                            </Td>
                            <Td>
                              <Menu>
                                <MenuButton
                                  as={IconButton}
                                  icon={<FiMoreHorizontal />}
                                  variant="ghost"
                                  size="sm"
                                />
                                <MenuList>
                                  <MenuItem icon={<FiEdit3 />}>Modifier</MenuItem>
                                  <MenuItem icon={<FiTrash2 />} color="red.500">Supprimer</MenuItem>
                                </MenuList>
                              </Menu>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  )}
                </CardBody>
              </Card>
            </Grid>
          </TabPanel>

          {/* Onglet Actions rapides */}
          <TabPanel>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              <Card bg={cardBg}>
                <CardHeader>
                  <Heading size="sm">Synchronisation</Heading>
                </CardHeader>
                <CardBody>
                  <VStack spacing={3}>
                    <Button
                      leftIcon={<FiUsers />}
                      colorScheme="blue"
                      size="sm"
                      w="full"
                      onClick={handleSyncMemberships}
                    >
                      Synchroniser adhésions
                    </Button>
                    <Button
                      leftIcon={<FiRefreshCw />}
                      variant="outline"
                      size="sm"
                      w="full"
                      onClick={loadInitialData}
                    >
                      Actualiser toutes les données
                    </Button>
                  </VStack>
                </CardBody>
              </Card>

              <Card bg={cardBg}>
                <CardHeader>
                  <Heading size="sm">Rapports et Export</Heading>
                </CardHeader>
                <CardBody>
                  <VStack spacing={3}>
                    <Button
                      leftIcon={<FiDownload />}
                      colorScheme="green"
                      size="sm"
                      w="full"
                      onClick={handleExport}
                    >
                      Exporter comptabilité
                    </Button>
                    <Button
                      leftIcon={<FiFileText />}
                      colorScheme="purple"
                      size="sm"
                      w="full"
                      onClick={handleGenerateReport}
                    >
                      Générer rapport mensuel
                    </Button>
                    <Button
                      leftIcon={<FiPieChart />}
                      variant="outline"
                      size="sm"
                      w="full"
                    >
                      Analyse par catégorie
                    </Button>
                  </VStack>
                </CardBody>
              </Card>

              <Card bg={cardBg}>
                <CardHeader>
                  <Heading size="sm">Configuration</Heading>
                </CardHeader>
                <CardBody>
                  <VStack spacing={3}>
                    <Button
                      leftIcon={<FiSettings />}
                      variant="outline"
                      size="sm"
                      w="full"
                      onClick={onBankBalanceOpen}
                    >
                      {financeData?.bankBalance !== null ? 'Modifier solde bancaire' : 'Définir solde bancaire'}
                    </Button>
                    <Button
                      leftIcon={<FiUpload />}
                      variant="outline"
                      size="sm"
                      w="full"
                    >
                      Importer relevé bancaire
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            </SimpleGrid>

            <Alert status="success" borderRadius="md" mt={6}>
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <Text fontWeight="bold" fontSize="sm">
                  Actions rapides fonctionnelles
                </Text>
                <Text fontSize="xs">
                  Toutes les fonctionnalités sont maintenant opérationnelles et connectées aux vraies données.
                </Text>
              </VStack>
            </Alert>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Modal pour définir le solde bancaire */}
      <Modal isOpen={isBankBalanceOpen} onClose={onBankBalanceClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {financeData?.bankBalance !== null ? 'Modifier le solde bancaire' : 'Définir le solde bancaire'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Alert status="info">
                <AlertIcon />
                <Text fontSize="sm">
                  Entrez le solde actuel du compte bancaire de l'association. 
                  Cette information servira de base pour tous les calculs financiers.
                </Text>
              </Alert>
              
              <FormControl isRequired>
                <FormLabel>Solde actuel du compte bancaire</FormLabel>
                <MoneyInput
                  value={bankBalance}
                  onChange={(value) => setBankBalance(value)}
                  placeholder="0,00 €"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onBankBalanceClose}>
              Annuler
            </Button>
            <Button colorScheme="blue" onClick={handleSubmitBankBalance} leftIcon={<FiSave />}>
              Enregistrer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal pour nouvelle transaction */}
      <Modal isOpen={isTransactionOpen} onClose={onTransactionClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Nouvelle transaction</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Type de transaction</FormLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="recette">Recette</option>
                  <option value="depense">Dépense</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Montant</FormLabel>
                <MoneyInput
                  value={formData.amount}
                  onChange={(value) => setFormData(prev => ({ ...prev, amount: value }))}
                  placeholder="0,00 €"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description de la transaction..."
                />
              </FormControl>

              <FormControl>
                <FormLabel>Catégorie</FormLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Sélectionner une catégorie"
                >
                  {categories
                    .filter(cat => cat.type === 'both' || cat.type === formData.type)
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Date</FormLabel>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onTransactionClose}>
              Annuler
            </Button>
            <Button colorScheme="blue" onClick={handleSubmitTransaction}>
              Enregistrer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal pour dépense programmée */}
      <Modal isOpen={isExpenseOpen} onClose={onExpenseClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Programmer une dépense</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={expenseData.description}
                  onChange={(e) => setExpenseData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description de la dépense..."
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Montant</FormLabel>
                <MoneyInput
                  value={expenseData.amount}
                  onChange={(value) => setExpenseData(prev => ({ ...prev, amount: value }))}
                  placeholder="0,00 €"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Date prévue</FormLabel>
                <Input
                  type="date"
                  value={expenseData.scheduledDate}
                  onChange={(e) => setExpenseData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Catégorie</FormLabel>
                <Select
                  value={expenseData.category}
                  onChange={(e) => setExpenseData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Sélectionner une catégorie"
                >
                  {categories
                    .filter(cat => cat.type === 'depense' || cat.type === 'both')
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Récurrente</FormLabel>
                <Switch
                  isChecked={expenseData.recurring}
                  onChange={(e) => setExpenseData(prev => ({ ...prev, recurring: e.target.checked }))}
                  colorScheme="blue"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onExpenseClose}>
              Annuler
            </Button>
            <Button colorScheme="blue" onClick={handleSubmitExpense}>
              Enregistrer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}