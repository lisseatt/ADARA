import { ProductSizePreset } from '../types/sales';

export interface ProductPreset {
  name: string;
  defaultSize: ProductSizePreset;
  customSizeText?: string;
  defaultPrice: number;
  category: 'Shampoo' | 'Acondicionador' | 'Crema' | 'Tratamientos Capilares' | 'Aceites' | 'Jabonería' | 'Facial' | 'Corporal';
  description?: string;
}

// Variedades capilares
const VARIEDADES_CAPILARES = [
  'Romero y Cebolla',
  'Keratina',
  'Fresa',
  'Manzanilla y Miel',
  'Cebolla y Jengibre',
  'Bomba Herbal',
  'Bálsamo',
  'Café',
  'Sábila',
  'Carbón Activado'
];

// Generar catálogo de Shampoos, Acondicionadores y Cremas separando sus categorías
const generarCapilares = (): ProductPreset[] => {
  const lista: ProductPreset[] = [];
  const tipos = [
    { tipo: 'Shampoo', categoria: 'Shampoo' as const },
    { tipo: 'Acondicionador', categoria: 'Acondicionador' as const },
    { tipo: 'Crema', categoria: 'Crema' as const }
  ];

  tipos.forEach(({ tipo, categoria }) => {
    VARIEDADES_CAPILARES.forEach(variedad => {
      // Presentación 250 ml - $2.99
      lista.push({
        name: `${tipo} de ${variedad}`,
        defaultSize: '250 ml',
        defaultPrice: 2.99,
        category: categoria,
        description: `${tipo} botánico (${variedad}) de 250 ml.`
      });

      // Presentación 500 ml - $4.99
      lista.push({
        name: `${tipo} de ${variedad}`,
        defaultSize: '500 ml',
        defaultPrice: 4.99,
        category: categoria,
        description: `${tipo} botánico (${variedad}) de 500 ml.`
      });
    });
  });

  return lista;
};

// Variedades de Jabones artesanales de 125 gr - $2.99
const VARIEDADES_JABONES = [
  'Bálsamo',
  'Coco',
  'Avena y Miel',
  'Bicarbonato',
  'Carbón Activado',
  'Cúrcuma',
  'Sábila y Pepino',
  'Arroz y Vitamina E',
  'Rosa Mosqueta'
];

const generarJabones = (): ProductPreset[] => {
  return VARIEDADES_JABONES.map(variedad => ({
    name: `Jabón de ${variedad}`,
    defaultSize: '125 gr',
    defaultPrice: 2.99,
    category: 'Jabonería',
    description: `Jabón artesanal botánico de ${variedad} (125 gramos).`
  }));
};

export const ARTISAN_CATALOG_PRESETS: ProductPreset[] = [
  // 1. Shampoos, Acondicionadores y Cremas
  ...generarCapilares(),

  // 2. Otros tratamientos capilares
  {
    name: 'Tónico Capilar',
    defaultSize: '250 ml',
    defaultPrice: 3.49,
    category: 'Tratamientos Capilares',
    description: 'Tónico estimulante y fortalecedor capilar de 250 ml.'
  },
  {
    name: 'Mascarilla Capilar con Cacao',
    defaultSize: '8 oz',
    defaultPrice: 5.99,
    category: 'Tratamientos Capilares',
    description: 'Nutrición intensa con manteca de cacao pura de 8 onzas.'
  },

  // 3. Aceites esenciales y puros
  {
    name: 'Aceite Esencial de Naranja',
    defaultSize: 'Otro',
    customSizeText: 'Esencial',
    defaultPrice: 6.50,
    category: 'Aceites',
    description: 'Aceite esencial puro aromaterapéutico.'
  },
  {
    name: 'Aceite Esencial de Jojoba',
    defaultSize: 'Otro',
    customSizeText: 'Esencial',
    defaultPrice: 6.50,
    category: 'Aceites',
    description: 'Aceite de jojoba prensado en frío puro.'
  },
  {
    name: 'Aceite Esencial de Almendra',
    defaultSize: 'Otro',
    customSizeText: 'Esencial',
    defaultPrice: 6.50,
    category: 'Aceites',
    description: 'Aceite puro de almendras dulces.'
  },
  {
    name: 'Aceite Esencial de Árbol de Té',
    defaultSize: 'Otro',
    customSizeText: 'Esencial',
    defaultPrice: 6.50,
    category: 'Aceites',
    description: 'Aceite puro purificante de tea tree.'
  },
  {
    name: 'Aceite de Coco (120 ml)',
    defaultSize: '120 ml',
    defaultPrice: 3.00,
    category: 'Aceites',
    description: 'Aceite de coco virgen extra 120 ml.'
  },
  {
    name: 'Aceite de Coco (250 ml)',
    defaultSize: '250 ml',
    defaultPrice: 6.00,
    category: 'Aceites',
    description: 'Aceite de coco virgen extra 250 ml.'
  },
  {
    name: 'Aceite de Romero (60 ml)',
    defaultSize: '60 ml',
    defaultPrice: 3.00,
    category: 'Aceites',
    description: 'Aceite de romero macerado artesanal 60 ml.'
  },
  {
    name: 'Aceite de Romero (120 ml)',
    defaultSize: '120 ml',
    defaultPrice: 5.00,
    category: 'Aceites',
    description: 'Aceite de romero macerado artesanal 120 ml.'
  },

  // 4. Jabonería artesanal de 125 gr ($2.99)
  ...generarJabones(),

  // 5. Cuidado Facial
  {
    name: 'Agua Micelar',
    defaultSize: 'Otro',
    customSizeText: '200 ml',
    defaultPrice: 4.99,
    category: 'Facial',
    description: 'Limpiadora y tonificante suave botánica de 200 ml.'
  },
  {
    name: 'Crema con Filtro Solar',
    defaultSize: '250 ml',
    defaultPrice: 5.99,
    category: 'Facial',
    description: 'Protección solar mineral y humectante 250 ml.'
  },
  {
    name: 'Espuma Facial de Fresa',
    defaultSize: 'Otro',
    customSizeText: 'Sin tamaño',
    defaultPrice: 3.49,
    category: 'Facial',
    description: 'Espuma suave limpiadora con extracto de fresa natural.'
  },
  {
    name: 'Crema Facial con Baba de Caracol',
    defaultSize: 'Otro',
    customSizeText: 'Sin tamaño',
    defaultPrice: 3.25,
    category: 'Facial',
    description: 'Regeneradora y reafirmante celular con extracto de baba de caracol.'
  },

  // 6. Corporal & Exfoliantes
  {
    name: 'Scrub Sugar',
    defaultSize: '8 oz',
    defaultPrice: 4.99,
    category: 'Corporal',
    description: 'Exfoliante corporal a base de azúcar natural de 8 onzas.'
  },
  {
    name: 'Redu Gel',
    defaultSize: '8 oz',
    defaultPrice: 4.99,
    category: 'Corporal',
    description: 'Gel reductor y reafirmante corporal botánico de 8 onzas.'
  },
  {
    name: 'Exfoliante de Avena y Miel',
    defaultSize: 'Otro',
    customSizeText: '227 gr',
    defaultPrice: 4.99,
    category: 'Corporal',
    description: 'Exfoliante nutritivo y calmante de 227 gramos.'
  },
  {
    name: 'Crema Corporal de Coco y Vitamina C',
    defaultSize: '4 oz',
    defaultPrice: 3.49,
    category: 'Corporal',
    description: 'Crema corporal iluminadora e hidratante de 4 onzas.'
  }
];

export const INITIAL_DEMO_ORDERS = [
  {
    numeroPedido: 1,
    fecha: "2026-09-20",
    cliente: "Mariana Silva Gómez",
    direccion: "Av. Las Palmas 312, Residencial",
    items: [
      {
        id: "demo-1-1",
        producto: "Shampoo de Romero y Cebolla",
        tamano: "250 ml",
        tamanoTipo: "250 ml" as ProductSizePreset,
        cantidad: 1,
        precioUnitario: 2.99,
        subtotal: 2.99
      },
      {
        id: "demo-1-2",
        producto: "Acondicionador de Romero y Cebolla",
        tamano: "250 ml",
        tamanoTipo: "250 ml" as ProductSizePreset,
        cantidad: 1,
        precioUnitario: 2.99,
        subtotal: 2.99
      },
      {
        id: "demo-1-3",
        producto: "Tónico Capilar",
        tamano: "250 ml",
        tamanoTipo: "250 ml" as ProductSizePreset,
        cantidad: 1,
        precioUnitario: 3.49,
        subtotal: 3.49
      }
    ],
    granTotal: 9.47,
    createdAt: "2026-09-20T14:30:00Z",
    syncedToSheets: true
  },
  {
    numeroPedido: 2,
    fecha: "2026-09-28",
    cliente: "Carlos Eduardo Montes",
    direccion: "Calle Mirador 89, Centro",
    items: [
      {
        id: "demo-2-1",
        producto: "Aceite de Coco (120 ml)",
        tamano: "120 ml",
        tamanoTipo: "120 ml" as ProductSizePreset,
        cantidad: 1,
        precioUnitario: 3.00,
        subtotal: 3.00
      },
      {
        id: "demo-2-2",
        producto: "Jabón de Carbón Activado",
        tamano: "125 gr",
        tamanoTipo: "125 gr" as ProductSizePreset,
        cantidad: 2,
        precioUnitario: 2.99,
        subtotal: 5.98
      }
    ],
    granTotal: 8.98,
    createdAt: "2026-09-28T17:15:00Z",
    syncedToSheets: true
  },
  {
    numeroPedido: 3,
    fecha: "2026-10-02",
    cliente: "Valentina Ramos Paredes",
    direccion: "Colonia Altamira #405",
    items: [
      {
        id: "demo-3-1",
        producto: "Scrub Sugar",
        tamano: "8 oz",
        tamanoTipo: "8 oz" as ProductSizePreset,
        cantidad: 1,
        precioUnitario: 4.99,
        subtotal: 4.99
      },
      {
        id: "demo-3-2",
        producto: "Espuma Facial de Fresa",
        tamano: "Sin tamaño",
        tamanoTipo: "Otro" as ProductSizePreset,
        cantidad: 1,
        precioUnitario: 3.49,
        subtotal: 3.49
      },
      {
        id: "demo-3-3",
        producto: "Crema Facial con Baba de Caracol",
        tamano: "Sin tamaño",
        tamanoTipo: "Otro" as ProductSizePreset,
        cantidad: 1,
        precioUnitario: 3.25,
        subtotal: 3.25
      }
    ],
    granTotal: 11.73,
    createdAt: "2026-10-02T11:45:00Z",
    syncedToSheets: true
  },
  {
    numeroPedido: 4,
    fecha: "2026-10-05",
    cliente: "Sofía Navarro Cruz",
    direccion: "Paseo del Valle 120",
    items: [
      {
        id: "demo-4-1",
        producto: "Shampoo de Keratina",
        tamano: "500 ml",
        tamanoTipo: "500 ml" as ProductSizePreset,
        cantidad: 1,
        precioUnitario: 4.99,
        subtotal: 4.99
      },
      {
        id: "demo-4-2",
        producto: "Mascarilla Capilar con Cacao",
        tamano: "8 oz",
        tamanoTipo: "8 oz" as ProductSizePreset,
        cantidad: 1,
        precioUnitario: 5.99,
        subtotal: 5.99
      },
      {
        id: "demo-4-3",
        producto: "Crema con Filtro Solar",
        tamano: "250 ml",
        tamanoTipo: "250 ml" as ProductSizePreset,
        cantidad: 1,
        precioUnitario: 5.99,
        subtotal: 5.99
      }
    ],
    granTotal: 16.97,
    createdAt: "2026-10-05T16:20:00Z",
    syncedToSheets: true
  }
];
