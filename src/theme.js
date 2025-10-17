import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  fonts: {
    heading: 'Montserrat, sans-serif',
    body: 'Montserrat, sans-serif',
  },
  styles: {
    global: {
      body: {
        fontFamily: 'Montserrat, sans-serif',
      },
    },
  },
  colors: {
    brand: {
      50: '#e6f7ff',
      100: '#bae7ff',
      200: '#91d5ff',
      300: '#69c0ff',
      400: '#40a9ff',
      500: '#1890ff',
      600: '#096dd9',
      700: '#0050b3',
      800: '#003a8c',
      900: '#002766',
    },
  },
  components: {
    Card: {
      baseStyle: {
        container: {
          fontFamily: 'Montserrat, sans-serif',
        },
      },
    },
    Heading: {
      baseStyle: {
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: '600',
      },
    },
    Text: {
      baseStyle: {
        fontFamily: 'Montserrat, sans-serif',
      },
    },
    Button: {
      baseStyle: {
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: '500',
      },
    },
  },
});

export default theme;