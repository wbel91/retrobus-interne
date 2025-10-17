import React from 'react';
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  useColorModeValue
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi';

const PageLayout = ({ 
  title, 
  subtitle, 
  breadcrumbs = [], 
  children, 
  headerActions,
  bgGradient,
  maxW = "container.xl"
}) => {
  const headerBg = useColorModeValue(
    bgGradient || "linear(to-r, rbe.600, rbe.800)",
    "linear(to-r, rbe.700, rbe.900)"
  );

  return (
    <Box minH="100vh" fontFamily="Montserrat, system-ui, sans-serif">
      {/* En-tête moderne avec gradient */}
      <Box
        bgGradient={headerBg}
        color="white"
        py={{ base: 12, md: 16 }}
        position="relative"
        overflow="hidden"
      >
        {/* Effet de profondeur */}
        <Box
          position="absolute"
          inset={0}
          bgGradient="radial(circle at 30% 30%, whiteAlpha.200, transparent 50%)"
          pointerEvents="none"
        />
        
        <Container maxW={maxW} position="relative">
          <VStack spacing={6} align="stretch">
            {/* Breadcrumb */}
            {breadcrumbs.length > 0 && (
              <Breadcrumb 
                separator={<FiChevronRight color="whiteAlpha.700" />}
                color="whiteAlpha.800"
                fontSize="sm"
              >
                {breadcrumbs.map((crumb, index) => (
                  <BreadcrumbItem key={index}>
                    <BreadcrumbLink 
                      as={RouterLink} 
                      to={crumb.href}
                      _hover={{ color: "white" }}
                    >
                      {crumb.label}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                ))}
              </Breadcrumb>
            )}
            
            {/* Titre et sous-titre */}
            <VStack spacing={4} textAlign="center">
              <Heading 
                as="h1" 
                size="2xl" 
                fontWeight="800" 
                letterSpacing="-0.025em"
                textShadow="0 2px 4px rgba(0,0,0,0.1)"
              >
                {title}
              </Heading>
              
              {subtitle && (
                <Text 
                  fontSize={{ base: "lg", md: "xl" }} 
                  opacity={0.9}
                  maxW="2xl"
                  lineHeight="relaxed"
                >
                  {subtitle}
                </Text>
              )}
              
              {headerActions && (
                <Box pt={4}>
                  {headerActions}
                </Box>
              )}
            </VStack>
          </VStack>
        </Container>
      </Box>

      {/* Contenu principal */}
      <Container maxW={maxW} py={{ base: 8, md: 12 }}>
        {children}
      </Container>
    </Box>
  );
};

export default PageLayout;