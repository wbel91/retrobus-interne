import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  // === TYPOGRAPHY ===
  fonts: {
    heading: 'Montserrat, system-ui, sans-serif',
    body: 'Montserrat, system-ui, sans-serif',
  },
  
  // === GLOBAL STYLES ===
  styles: {
    global: {
      body: {
        fontFamily: 'Montserrat, system-ui, sans-serif',
        bg: 'gray.50',
        color: 'gray.800',
      },
      '*': {
        borderColor: 'gray.200',
      }
    },
  },
  
  // === COLORS ===
  colors: {
    // Couleurs officielles RBE
    rbe: {
      50: '#fef2f4',
      100: '#fde2e7',
      200: '#facbd4',
      300: '#f5a3b2',
      400: '#ed7189',
      500: '#e14964', // Couleur principale RBE
      600: '#be003c', // Rouge RBE officiel
      700: '#9f1d3d',
      800: '#881b38',
      900: '#751a35',
    },
    // Palette complémentaire moderne
    brand: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
    // Couleurs d'état modernes
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
    },
    // Tons neutres modernes
    gray: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    }
  },
  
  // === SEMANTIC TOKENS ===
  semanticTokens: {
    colors: {
      primary: {
        default: 'rbe.600',
        _dark: 'rbe.400',
      },
      accent: {
        default: 'rbe.500',
        _dark: 'rbe.300',
      },
      background: {
        default: 'gray.50',
        _dark: 'gray.900',
      },
      surface: {
        default: 'white',
        _dark: 'gray.800',
      },
      muted: {
        default: 'gray.100',
        _dark: 'gray.700',
      }
    }
  },
  
  // === COMPONENT STYLES ===
  components: {
    // Cards modernes
    Card: {
      baseStyle: {
        container: {
          fontFamily: 'Montserrat, system-ui, sans-serif',
          borderRadius: 'xl',
          boxShadow: 'sm',
          border: '1px solid',
          borderColor: 'gray.200',
          transition: 'all 0.2s ease-out',
          _hover: {
            boxShadow: 'md',
            transform: 'translateY(-2px)',
          }
        },
      },
      variants: {
        modern: {
          container: {
            bg: 'white',
            borderRadius: '2xl',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            border: 'none',
            _hover: {
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              transform: 'translateY(-4px)',
            }
          }
        },
        gradient: {container: {
          bgGradient: 'linear(to-br, rbe.500, rbe.700)',
          color: 'white',
          border: 'none',
          _hover: {
            bgGradient: 'linear(to-br, rbe.400, rbe.600)',
          }
        }}
      }
    },
    
    // Headings uniformes
    Heading: {
      baseStyle: {
        fontFamily: 'Montserrat, system-ui, sans-serif',
        fontWeight: '700',
        letterSpacing: '-0.025em',
        lineHeight: 'shorter',
      },
      variants: {
        page: {
          fontSize: { base: '2xl', md: '4xl' },
          fontWeight: '800',
          bgGradient: 'linear(to-r, rbe.600, rbe.800)',
          bgClip: 'text',
          textAlign: 'center',
          mb: 2,
        },
        section: {
          fontSize: { base: 'xl', md: '2xl' },
          fontWeight: '700',
          color: 'gray.800',
          mb: 4,
        },
        card: {
          fontSize: { base: 'lg', md: 'xl' },
          fontWeight: '600',
          color: 'gray.700',
        }
      }
    },
    
    // Texte harmonisé
    Text: {
      baseStyle: {
        fontFamily: 'Montserrat, system-ui, sans-serif',
        lineHeight: 'relaxed',
      },
      variants: {
        subtitle: {
          fontSize: { base: 'md', md: 'lg' },
          color: 'gray.600',
          textAlign: 'center',
          maxW: '2xl',
          mx: 'auto',
        },
        description: {
          fontSize: 'sm',
          color: 'gray.600',
          lineHeight: 'relaxed',
        }
      }
    },
    
    // Buttons modernes
    Button: {
      baseStyle: {
        fontFamily: 'Montserrat, system-ui, sans-serif',
        fontWeight: '600',
        borderRadius: 'lg',
        transition: 'all 0.2s ease-out',
        _focus: {
          boxShadow: '0 0 0 3px rgba(190, 0, 60, 0.1)',
        }
      },
      variants: {
        primary: {
          bg: 'rbe.600',
          color: 'white',
          _hover: {
            bg: 'rbe.700',
            transform: 'translateY(-1px)',
            boxShadow: 'lg',
          },
          _active: {
            bg: 'rbe.800',
          }
        },
        secondary: {
          bg: 'white',
          color: 'rbe.600',
          borderWidth: '2px',
          borderColor: 'rbe.600',
          _hover: {
            bg: 'rbe.50',
            transform: 'translateY(-1px)',
          }
        },
        modern: {
          bg: 'white',
          color: 'gray.700',
          borderWidth: '1px',
          borderColor: 'gray.300',
          boxShadow: 'sm',
          _hover: {
            bg: 'gray.50',
            borderColor: 'gray.400',
            transform: 'translateY(-1px)',
            boxShadow: 'md',
          }
        }
      },
      sizes: {
        modern: {
          h: '12',
          px: '6',
          fontSize: 'sm',
          fontWeight: '600',
        }
      }
    },
    
    // Container responsive
    Container: {
      baseStyle: {
        maxW: 'container.xl',
        px: { base: 4, md: 8 },
      }
    },
    
    // Badge moderne
    Badge: {
      baseStyle: {
        fontFamily: 'Montserrat, system-ui, sans-serif',
        fontWeight: '600',
        fontSize: 'xs',
        textTransform: 'none',
        borderRadius: 'md',
        px: 2,
        py: 1,
      }
    },
    
    // Modal harmonisé
    Modal: {
      baseStyle: {
        dialog: {
          borderRadius: '2xl',
          boxShadow: '2xl',
        },
        header: {
          fontFamily: 'Montserrat, system-ui, sans-serif',
          fontWeight: '700',
          fontSize: 'xl',
          color: 'gray.800',
        }
      }
    }
  },
  
  // === LAYOUT ===
  breakpoints: {
    base: '0em',
    sm: '30em',
    md: '48em',
    lg: '62em',
    xl: '80em',
    '2xl': '96em',
  },
  
  // === SHADOWS ===
  shadows: {
    modern: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    'modern-lg': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    'rbe': '0 4px 14px 0 rgba(190, 0, 60, 0.15)',
  },
  
  // === BORDERS ===
  radii: {
    modern: '12px',
    'modern-lg': '16px',
    'modern-xl': '20px',
  }
});

export default theme;