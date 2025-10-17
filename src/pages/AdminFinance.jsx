import React, { useState, useEffect } from "react";
import {
  Grid, VStack, HStack, Badge, useToast, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  useDisclosure, FormControl, FormLabel, Textarea, 
  Alert, AlertIcon, InputGroup, InputLeftElement, 
  ButtonGroup, IconButton, Menu, MenuButton, MenuList, MenuItem,
  Spinner, Tabs, TabList, TabPanels, Tab, TabPanel,
  Switch, Table, Thead, Tbody, Tr, Th, Td, Text, Button, Input, Select
} from "@chakra-ui/react";
import {
  FiDollarSign, FiTrendingUp, FiTrendingDown, FiPlus, FiMinus,
  FiPieChart, FiBarChart, FiCalendar, FiCreditCard, FiDownload,
  FiUpload, FiEdit3, FiTrash2, FiMoreHorizontal, FiCheck,
  FiX, FiRefreshCw, FiEye, FiFilter, FiSearch, FiUsers, FiSave,
  FiClock, FiSettings, FiRepeat
} from "react-icons/fi";
import { useUser } from '../context/UserContext';
import { financeAPI } from '../api/finance';
import PageLayout from '../components/Layout/PageLayout';
import StatsGrid from '../components/Layout/StatsGrid';
import ModernCard from '../components/Layout/ModernCard';

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

// Composant pour afficher les statistiques financières modernes
const FinanceStats = ({ data, loading }) => {
  const stats = [
    {
      label: "Recettes du mois",
      value: data?.monthlyRevenue || "0,00 €",
      icon: FiTrendingUp,
      color: "success",
      change: data?.revenueGrowth > 0 ? {
        type: "increase",
        value: `+${data?.revenueGrowth}% vs mois dernier`
      } : undefined
    },
    {
      label: "Dépenses du mois", 
      value: data?.monthlyExpenses || "0,00 €",
      icon: FiTrendingDown,
      color: "warning",
      change: { type: "decrease", value: "Optimisé ce mois" }
    },
    {
      label: "Solde bancaire",
      value: data?.currentBalance || "0,00 €", 
      icon: FiBarChart,
      color: "brand"
    },
    {
      label: "Adhésions encaissées",
      value: `${data?.activeMembers || 0} membres`,
      icon: FiUsers,
      color: "purple",
      change: { type: "increase", value: data?.membershipRevenue || "0,00 €" }
    }
  ];

  return <StatsGrid stats={stats} loading={loading} />;
};

// Composant principal mis à jour
export default function AdminFinance() {
  const { user } = useUser();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    isOpen: isBankBalanceOpen, 
    onOpen: onBankBalanceOpen, 
    onClose: onBankBalanceClose 
  } = useDisclosure();
  const { 
    isOpen: isScheduledOperationOpen, 
    onOpen: onScheduledOperationOpen, 
    onClose: onScheduledOperationClose 
  } = useDisclosure();
  
  const [transactions, setTransactions] = useState([]);
  const [financeData, setFinanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [bankBalance, setBankBalance] = useState(0);
  const [scheduledOperations, setScheduledOperations] = useState([]);
  
  const [formData, setFormData] = useState({
    type: 'recette',
    amount: 0,
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [bankBalanceData, setBankBalanceData] = useState({
    balance: 0
  });
  
  const [operationFormData, setOperationFormData] = useState({
    type: 'depense',
    description: '',
    amount: 0,
    dueDate: '',
    category: '',
    recurring: 'none',
    isScheduled: true,
    notes: ''
  });
  
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20
  });

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
      loadCategories(),
      loadBankBalance(),
      loadScheduledOperations()
    ]);
  };

  const loadFinanceData = async () => {
    try {
      setLoading(true);
      console.log('🏦 Chargement des données financières...');
      
      const data = await financeAPI.getStats();
      console.log('📊 Données financières reçues:', data);
      
      setFinanceData(data);
      
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
        description: `Impossible de charger les données financières: ${error.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      
      // Données par défaut si l'API échoue
      setFinanceData({
        monthlyRevenue: "0,00 €",
        monthlyExpenses: "0,00 €",
        currentBalance: "0,00 €",
        membershipRevenue: "0,00 €",
        activeMembers: 0,
        revenueGrowth: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBankBalance = async () => {
    try {
      const data = await financeAPI.getBankBalance();
      setBankBalance(data.balance);
      setBankBalanceData({ balance: data.balance });
    } catch (error) {
      console.error('❌ Erreur chargement solde bancaire:', error);
    }
  };

  const loadScheduledOperations = async () => {
    try {
      const data = await financeAPI.getScheduledOperations();
      setScheduledOperations(data.operations || []);
    } catch (error) {
      console.error('❌ Erreur chargement opérations programmées:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      setTransactionsLoading(true);
      console.log('💳 Chargement des transactions...');
      
      const data = await financeAPI.getTransactions(filters);
      console.log('📋 Transactions reçues:', data);
      
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('❌ Erreur chargement transactions:', error);
      toast({
        title: "Erreur",
        description: `Impossible de charger les transactions: ${error.message}`,
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await financeAPI.getCategories();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('❌ Erreur chargement catégories:', error);
      // Catégories par défaut
      setCategories([
        { id: 'adhesions', name: 'Adhésions' },
        { id: 'evenements', name: 'Événements' },
        { id: 'carburant', name: 'Carburant' },
        { id: 'maintenance', name: 'Maintenance' },
        { id: 'assurance', name: 'Assurance' },
        { id: 'materiel', name: 'Matériel' },
        { id: 'frais_admin', name: 'Frais administratifs' },
        { id: 'autres', name: 'Autres' }
      ]);
    }
  };

  const handleSubmit = async () => {
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

      setTransactions(prev => [newTransaction, ...prev]);
      
      setFormData({
        type: 'recette',
        amount: 0,
        description: '',
        category: '',
        date: new Date().toISOString().split('T')[0]
      });

      onClose();
      
      toast({
        title: "Succès",
        description: "Transaction enregistrée avec succès",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      
      loadFinanceData();
    } catch (error) {
      console.error('❌ Erreur création transaction:', error);
      toast({
        title: "Erreur",
        description: `Impossible d'enregistrer la transaction: ${error.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleBankBalanceSubmit = async () => {
    try {
      const result = await financeAPI.setBankBalance(bankBalanceData.balance);
      setBankBalance(result.balance);
      onBankBalanceClose();
      
      toast({
        title: "Succès",
        description: `Solde bancaire mis à jour: ${result.formatted}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      
      // Recharger les données financières
      loadFinanceData();
    } catch (error) {
      console.error('❌ Erreur mise à jour solde:', error);
      toast({
        title: "Erreur",
        description: `Impossible de mettre à jour le solde: ${error.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleScheduledOperationSubmit = async () => {
    try {
      if (!operationFormData.description || !operationFormData.amount) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir la description et le montant",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const newOperation = await financeAPI.createScheduledOperation(operationFormData);
      setScheduledOperations(prev => [...prev, newOperation]);
      
      setOperationFormData({
        type: 'depense',
        description: '',
        amount: 0,
        dueDate: '',
        category: '',
        recurring: 'none',
        isScheduled: true,
        notes: ''
      });
      
      onScheduledOperationClose();
      
      toast({
        title: "Succès",
        description: "Opération programmée créée avec succès",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('❌ Erreur création opération programmée:', error);
      toast({
        title: "Erreur",
        description: `Impossible de créer l'opération programmée: ${error.message}`,
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
      
      await loadInitialData();
    } catch (error) {
      console.error('❌ Erreur synchronisation:', error);
      toast({
        title: "Erreur synchronisation",
        description: `Impossible de synchroniser les adhésions: ${error.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleExport = async () => {
    try {
      const blob = await financeAPI.exportData('csv');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finance-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export réussi",
        description: "Les données ont été exportées avec succès",
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
        duration: 3000,
        isClosable: true,
      });
    }
  };

  if (loading) {
    return (
      <PageLayout
        title="🏦 Gestion Financière"
        subtitle="Chargement des données financières..."
        bgGradient="linear(to-r, rbe.600, blue.600)"
      >
        <VStack spacing={8} py={16}>
          <Spinner size="xl" color="rbe.500" thickness="4px" />
          <Text color="gray.600">Synchronisation avec la base de données...</Text>
        </VStack>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="💰 Gestion Financière"
      subtitle="Suivi des recettes, dépenses et trésorerie de l'association"
      bgGradient="linear(to-r, rbe.600, green.600)"
      breadcrumbs={[
        { label: "MyRBE", href: "/dashboard/myrbe" },
        { label: "Gestion Financière", href: "/admin/finance" }
      ]}
      headerActions={
        <HStack spacing={3}>
          <Button
            leftIcon={<FiPlus />}
            variant="secondary"
            bg="whiteAlpha.200"
            color="white"
            borderColor="whiteAlpha.300"
            _hover={{ bg: "whiteAlpha.300" }}
            onClick={onOpen}
          >
            Nouvelle transaction
          </Button>
          <Button
            leftIcon={<FiClock />}
            variant="secondary"
            bg="whiteAlpha.200"
            color="white"
            borderColor="whiteAlpha.300"
            _hover={{ bg: "whiteAlpha.300" }}
            onClick={onScheduledOperationOpen}
          >
            Programmer opération
          </Button>
        </HStack>
      }
    >
      <VStack spacing={8} align="stretch">
        {/* Statistiques financières */}
        <FinanceStats data={financeData} loading={false} />

        {/* Onglets de gestion */}
        <Tabs variant="enclosed" colorScheme="rbe">
          <TabList>
            <Tab _selected={{ color: "rbe.600", borderColor: "rbe.600" }}>
              💳 Transactions
            </Tab>
            <Tab _selected={{ color: "rbe.600", borderColor: "rbe.600" }}>
              📅 Opérations programmées
            </Tab>
            <Tab _selected={{ color: "rbe.600", borderColor: "rbe.600" }}>
              ⚙️ Configuration
            </Tab>
          </TabList>

          <TabPanels>
            {/* Onglet Transactions */}
            <TabPanel px={0}>
              <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={8}>
                <ModernCard
                  title="Transactions récentes"
                  badge={{ label: `${transactions.length}`, color: "blue" }}
                >
                  <VStack spacing={4} align="stretch">
                    <HStack justify="space-between">
                      <ButtonGroup size="sm">
                        <Button
                          leftIcon={<FiPlus />}
                          variant="primary"
                          onClick={onOpen}
                        >
                          Nouvelle transaction
                        </Button>
                        <Button
                          leftIcon={<FiRefreshCw />}
                          variant="modern"
                          onClick={loadTransactions}
                          isLoading={transactionsLoading}
                        >
                          Actualiser
                        </Button>
                      </ButtonGroup>
                    </HStack>

                    {transactionsLoading ? (
                      <VStack py={8}>
                        <Spinner color="rbe.500" />
                        <Text color="gray.500">Chargement des transactions...</Text>
                      </VStack>
                    ) : transactions.length === 0 ? (
                      <VStack py={8} spacing={4}>
                        <Text color="gray.500" fontSize="lg">Aucune transaction trouvée</Text>
                        <Button 
                          size="sm" 
                          onClick={handleSyncMemberships} 
                          leftIcon={<FiUsers />}
                          variant="secondary"
                        >
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
                            <Tr key={transaction.id} _hover={{ bg: "gray.50" }}>
                              <Td fontSize="sm">
                                {new Date(transaction.date).toLocaleDateString('fr-FR')}
                              </Td>
                              <Td>
                                <Badge
                                  colorScheme={transaction.type === 'recette' ? 'success' : 'warning'}
                                  variant="subtle"
                                  borderRadius="md"
                                >
                                  {transaction.type === 'recette' ? 'Recette' : 'Dépense'}
                                </Badge>
                              </Td>
                              <Td>
                                <VStack align="start" spacing={0}>
                                  <Text fontSize="sm" fontWeight="500">
                                    {transaction.description}
                                  </Text>
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
                                  color={transaction.type === 'recette' ? 'success.600' : 'warning.600'}
                                  fontWeight="600"
                                  fontSize="sm"
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
                                    <MenuItem icon={<FiTrash2 />} color="red.500">
                                      Supprimer
                                    </MenuItem>
                                  </MenuList>
                                </Menu>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    )}
                  </VStack>
                </ModernCard>

                {/* Sidebar des actions rapides */}
                <VStack spacing={4}>
                  <ModernCard title="Actions rapides" color="gray">
                    <VStack spacing={3}>
                      <Button
                        leftIcon={<FiUsers />}
                        variant="modern"
                        size="sm"
                        w="full"
                        onClick={handleSyncMemberships}
                      >
                        Synchroniser adhésions
                      </Button>
                      <Button
                        leftIcon={<FiDownload />}
                        variant="modern"
                        size="sm"
                        w="full"
                        onClick={handleExport}
                      >
                        Exporter comptabilité
                      </Button>
                      <Button
                        leftIcon={<FiSettings />}
                        variant="modern"
                        size="sm"
                        w="full"
                        onClick={onBankBalanceOpen}
                      >
                        Configurer solde
                      </Button>
                    </VStack>
                  </ModernCard>

                  <Alert status="success" borderRadius="lg" border="1px solid" borderColor="success.200">
                    <AlertIcon />
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="600" fontSize="sm" color="success.800">
                        Données en temps réel
                      </Text>
                      <Text fontSize="xs" color="success.700">
                        Synchronisé avec {financeData?.activeMembers || 0} membres actifs
                      </Text>
                    </VStack>
                  </Alert>
                </VStack>
              </Grid>
            </TabPanel>

            {/* Onglet Opérations programmées */}
            <TabPanel px={0}>
              <Card bg={cardBg}>
                <CardHeader>
                  <HStack justify="space-between">
                    <Heading size="md">📅 Opérations programmées</Heading>
                    <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={onScheduledOperationOpen}>
                      Programmer une opération
                    </Button>
                  </HStack>
                </CardHeader>
                <CardBody>
                  {scheduledOperations.length === 0 ? (
                    <VStack py={8}>
                      <Icon as={FiClock} size="48px" color="gray.300" />
                      <Text color="gray.500">Aucune opération programmée</Text>
                      <Button size="sm" onClick={onScheduledOperationOpen} leftIcon={<FiPlus />}>
                        Programmer une opération
                      </Button>
                    </VStack>
                  ) : (
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Type</Th>
                          <Th>Description</Th>
                          <Th>Catégorie</Th>
                          <Th isNumeric>Montant</Th>
                          <Th>Date prévue</Th>
                          <Th>Récurrence</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {scheduledOperations.map((operation) => (
                          <Tr key={operation.id}>
                            <Td>
                              <Badge
                                colorScheme={operation.type === 'recette' ? 'green' : 'red'}
                                variant="subtle"
                              >
                                {operation.type === 'recette' ? 'Recette' : 'Dépense'}
                              </Badge>
                            </Td>
                            <Td>
                              <VStack align="start" spacing={0}>
                                <Text fontSize="sm" fontWeight="bold">{operation.description}</Text>
                                {operation.notes && (
                                  <Text fontSize="xs" color="gray.500">{operation.notes}</Text>
                                )}
                              </VStack>
                            </Td>
                            <Td>
                              <Badge variant="subtle">
                                {categories.find(c => c.id === operation.category)?.name || operation.category}
                              </Badge>
                            </Td>
                            <Td isNumeric>
                              <Text fontWeight="bold" 
                                color={operation.type === 'recette' ? 'green.500' : 'red.500'}>
                                {operation.type === 'recette' ? '+' : '-'}
                                {operation.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                              </Text>
                            </Td>
                            <Td>
                              {operation.dueDate ? (
                                new Date(operation.dueDate).toLocaleDateString('fr-FR')
                              ) : (
                                <Badge variant="outline">Pas de date</Badge>
                              )}
                            </Td>
                            <Td>
                              <HStack>
                                {operation.recurring !== 'none' && (
                                  <Icon as={FiRepeat} color="blue.500" size="sm" />
                                )}
                                <Text fontSize="sm">
                                  {operation.recurring === 'none' ? 'Unique' : 
                                   operation.recurring === 'monthly' ? 'Mensuelle' :
                                   operation.recurring === 'quarterly' ? 'Trimestrielle' :
                                   operation.recurring === 'yearly' ? 'Annuelle' : operation.recurring}
                                </Text>
                              </HStack>
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
                                  <MenuItem icon={<FiCheck />}>Exécuter maintenant</MenuItem>
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
            </TabPanel>

            {/* Onglet Configuration */}
            <TabPanel px={0}>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <Card bg={cardBg}>
                  <CardHeader>
                    <Heading size="md">Solde bancaire</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={4}>
                      <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                        {bankBalance.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                      </Text>
                      <Button size="sm" onClick={onBankBalanceOpen} leftIcon={<FiEdit3 />}>
                        Modifier le solde
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>

                <Card bg={cardBg}>
                  <CardHeader>
                    <Heading size="md">Prochaines dépenses</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={3}>
                      {scheduledOperations.slice(0, 3).map(operation => (
                        <HStack key={operation.id} justify="space-between" w="full">
                          <VStack align="start" spacing={0}>
                            <Text fontSize="sm" fontWeight="bold">{operation.description}</Text>
                            <Text fontSize="xs" color="gray.500">
                              {new Date(operation.dueDate).toLocaleDateString('fr-FR')}
                            </Text>
                          </VStack>
                          <Text fontWeight="bold" color="red.500">
                            {operation.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                          </Text>
                        </HStack>
                      ))}
                      <Button size="sm" onClick={onScheduledOperationOpen} leftIcon={<FiPlus />}>
                        Ajouter une dépense
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>
              </SimpleGrid>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      {/* Modal pour nouvelle transaction */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
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
                  {categories.map(cat => (
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
            <Button variant="ghost" mr={3} onClick={onClose}>
              Annuler
            </Button>
            <Button colorScheme="blue" onClick={handleSubmit}>
              Enregistrer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal pour configuration du solde bancaire */}
      <Modal isOpen={isBankBalanceOpen} onClose={onBankBalanceClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Configuration du solde bancaire</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Alert status="info">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="bold" fontSize="sm">
                    Solde du compte de l'association
                  </Text>
                  <Text fontSize="xs">
                    Entrez le solde actuel de votre compte bancaire. Cette information sera utilisée pour calculer la trésorerie disponible.
                  </Text>
                </VStack>
              </Alert>
              
              <FormControl isRequired>
                <FormLabel>Solde actuel du compte bancaire</FormLabel>
                <MoneyInput
                  value={bankBalanceData.balance}
                  onChange={(value) => setBankBalanceData({ balance: value })}
                  placeholder="0,00 €"
                  size="lg"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onBankBalanceClose}>
              Annuler
            </Button>
            <Button colorScheme="blue" onClick={handleBankBalanceSubmit} leftIcon={<FiSave />}>
              Enregistrer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal pour programmer une opération */}
      <Modal isOpen={isScheduledOperationOpen} onClose={onScheduledOperationClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>📅 Programmer une opération financière</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Alert status="info">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="bold" fontSize="sm">
                    Opération programmée
                  </Text>
                  <Text fontSize="xs">
                    Cette opération sera visible dans votre planning financier. La date est optionnelle pour les opérations sans échéance précise.
                  </Text>
                </VStack>
              </Alert>

              <FormControl isRequired>
                <FormLabel>Type d'opération</FormLabel>
                <Select
                  value={operationFormData.type}
                  onChange={(e) => setOperationFormData(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="recette">Recette</option>
                  <option value="depense">Dépense</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Description</FormLabel>
                <Input
                  value={operationFormData.description}
                  onChange={(e) => setOperationFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ex: Cotisation assurance, Maintenance véhicule..."
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Montant</FormLabel>
                <MoneyInput
                  value={operationFormData.amount}
                  onChange={(value) => setOperationFormData(prev => ({ ...prev, amount: value }))}
                  placeholder="0,00 €"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Date prévue (optionnelle)</FormLabel>
                <Input
                  type="date"
                  value={operationFormData.dueDate}
                  onChange={(e) => setOperationFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  placeholder="Laisser vide si pas de date précise"
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Laissez vide pour une opération sans date d'échéance précise
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>Catégorie</FormLabel>
                <Select
                  value={operationFormData.category}
                  onChange={(e) => setOperationFormData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Sélectionner une catégorie"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Récurrence</FormLabel>
                <Select
                  value={operationFormData.recurring}
                  onChange={(e) => setOperationFormData(prev => ({ ...prev, recurring: e.target.value }))}
                >
                  <option value="none">Unique</option>
                  <option value="monthly">Mensuelle</option>
                  <option value="quarterly">Trimestrielle</option>
                  <option value="yearly">Annuelle</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Notes (optionnel)</FormLabel>
                <Textarea
                  value={operationFormData.notes}
                  onChange={(e) => setOperationFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notes additionnelles sur cette opération..."
                  size="sm"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onScheduledOperationClose}>
              Annuler
            </Button>
            <Button colorScheme="blue" onClick={handleScheduledOperationSubmit} leftIcon={<FiSave />}>
              Programmer l'opération
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PageLayout>
  );
}