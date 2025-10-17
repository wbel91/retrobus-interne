import React from 'react';
import {
  SimpleGrid,
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Icon,
  HStack,
  Spinner,
  useColorModeValue
} from '@chakra-ui/react';

const StatCard = ({ label, value, change, icon, color = "brand", loading = false }) => {
  const cardBg = useColorModeValue("white", "gray.800");
  const statColor = useColorModeValue(`${color}.600`, `${color}.400`);

  return (
    <Card variant="modern" bg={cardBg}>
      <CardBody>
        <Stat>
          <HStack justify="space-between" align="start" mb={2}>
            <StatLabel color="gray.600" fontSize="sm" fontWeight="500">
              {label}
            </StatLabel>
            {icon && (
              <Icon as={icon} color={statColor} boxSize={5} />
            )}
          </HStack>
          
          <StatNumber color={statColor} fontSize="2xl" fontWeight="700">
            {loading ? <Spinner size="sm" /> : value}
          </StatNumber>
          
          {change && !loading && (
            <StatHelpText mb={0}>
              <StatArrow type={change.type} />
              {change.value}
            </StatHelpText>
          )}
        </Stat>
      </CardBody>
    </Card>
  );
};

const StatsGrid = ({ stats, loading = false }) => {
  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} loading={loading} />
      ))}
    </SimpleGrid>
  );
};

export default StatsGrid;
export { StatCard };