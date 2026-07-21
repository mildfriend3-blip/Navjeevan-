import { Product, FranchiseStore, StoreInventory, Town } from '../types';

export const FRANCHISE_STORES: FranchiseStore[] = [
  {
    id: 'Jalgaon',
    name: 'Navjeevan Plus - Jalgaon Main',
    address: 'Plot No. 42, Near Court Chowk, Jalgaon, Maharashtra 425001',
    contact: '+91 94222 12345',
    minOrderValue: 99,
    deliveryTimeMins: 12,
  },
  {
    id: 'Shahada',
    name: 'Navjeevan Plus - Shahada Plaza',
    address: 'Dongargaon Road, Near Bus Stand, Shahada, Maharashtra 425409',
    contact: '+91 94222 67890',
    minOrderValue: 99,
    deliveryTimeMins: 15,
  },
  {
    id: 'Nandurbar',
    name: 'Navjeevan Plus - Nandurbar Hub',
    address: 'Station Road, Opp. Civil Hospital, Nandurbar, Maharashtra 425412',
    contact: '+91 94222 54321',
    minOrderValue: 99,
    deliveryTimeMins: 18,
  },
  {
    id: 'Dhule',
    name: 'Navjeevan Plus - Dhule Bypass',
    address: 'Devpur Colony, Sakri Road, Dhule, Maharashtra 424001',
    contact: '+91 94222 98765',
    minOrderValue: 99,
    deliveryTimeMins: 14,
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  // Fruits & Vegetables
  {
    id: 'fv-mango',
    name: 'Fresh Alphonso Mango (Hapus)',
    category: 'fruits-veg',
    price: 349,
    unit: '6 Units (Half Dozen)',
    icon: 'Apple',
    imageColor: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
    imageUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=400&q=80',
    description: 'Sweet, rich, and juicy Alphonso mangoes, handpicked from the best orchards in Konkan.'
  },
  {
    id: 'fv-potato',
    name: 'Fresh Potato (Batata)',
    category: 'fruits-veg',
    price: 32,
    unit: '1 kg',
    icon: 'Sparkles',
    imageColor: 'linear-gradient(135deg, #ca8a04 0%, #854d0e 100%)',
    imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=400&q=80',
    description: 'Versatile, fresh, and earthy local potatoes, ideal for daily household cooking.'
  },
  {
    id: 'fv-onion',
    name: 'Fresh Red Onion (Kanda)',
    category: 'fruits-veg',
    price: 40,
    unit: '1 kg',
    icon: 'Sparkles',
    imageColor: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
    imageUrl: 'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=400&q=80',
    description: 'High-quality farm-fresh red onions from Nashik. Crisp and essential for every Indian kitchen.'
  },
  {
    id: 'fv-tomato',
    name: 'Fresh Country Tomato',
    category: 'fruits-veg',
    price: 28,
    unit: '500g',
    icon: 'Apple',
    imageColor: 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)',
    imageUrl: 'https://images.unsplash.com/photo-1518977822534-7049a61fc0c2?auto=format&fit=crop&w=400&q=80',
    description: 'Tangy, firm, and juicy country tomatoes, perfect for curries, salads, and soups.'
  },
  {
    id: 'fv-banana',
    name: 'Yaval Golden Bananas',
    category: 'fruits-veg',
    price: 45,
    unit: '1 Dozen (12 Units)',
    icon: 'Banana',
    imageColor: 'linear-gradient(135deg, #fef08a 0%, #eab308 100%)',
    imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=400&q=80',
    description: 'Premium sweet bananas grown locally in Yaval/Jalgaon region, packed with potassium.'
  },

  // Dairy & Bakery
  {
    id: 'db-milk',
    name: 'Amul Taaza Fresh Toned Milk',
    category: 'dairy-bakery',
    price: 28,
    unit: '500ml Pack',
    icon: 'Milk',
    imageColor: 'linear-gradient(135deg, #bfdbfe 0%, #3b82f6 100%)',
    imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=400&q=80',
    description: 'Pasteurized toned milk, rich in calcium and essential vitamins. Fresh daily delivery.'
  },
  {
    id: 'db-butter',
    name: 'Amul Salted Butter',
    category: 'dairy-bakery',
    price: 58,
    unit: '100g Pack',
    icon: 'Box',
    imageColor: 'linear-gradient(135deg, #fef08a 0%, #ca8a04 100%)',
    imageUrl: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=400&q=80',
    description: 'The classic Utterly Butterly Delicious salted pasteurized butter from Amul.'
  },
  {
    id: 'db-paneer',
    name: 'Amul Fresh Paneer Block',
    category: 'dairy-bakery',
    price: 90,
    unit: '200g Pack',
    icon: 'Package',
    imageColor: 'linear-gradient(135deg, #f3f4f6 0%, #d1d5db 100%)',
    imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80',
    description: 'Soft and hygienic block paneer. High protein content and perfectly rich texture.'
  },
  {
    id: 'db-bread',
    name: 'Wibs Premium Brown Bread',
    category: 'dairy-bakery',
    price: 45,
    unit: '400g Pack',
    icon: 'Cookie',
    imageColor: 'linear-gradient(135deg, #f5e0c3 0%, #8b5a2b 100%)',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80',
    description: 'High-fiber brown bread baked to perfection, healthy and fresh for breakfast toast.'
  },

  // Grocery & Staples
  {
    id: 'gr-rice',
    name: 'Fortune Biryani Classic Basmati Rice',
    category: 'grocery',
    price: 135,
    unit: '1 kg Pack',
    icon: 'Wheat',
    imageColor: 'linear-gradient(135deg, #fef3c7 0%, #d97706 100%)',
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80',
    description: 'Extra-long grain premium basmati rice with irresistible aroma, ideal for festive Biryanis.'
  },
  {
    id: 'gr-oil',
    name: 'Fortune Sunlite Refined Sunflower Oil',
    category: 'grocery',
    price: 125,
    unit: '1 Litre Pouch',
    icon: 'Droplet',
    imageColor: 'linear-gradient(135deg, #fef08a 0%, #eab308 100%)',
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80',
    description: 'Light, healthy refined sunflower oil rich in vitamins A, D, and E. Great for deep frying.'
  },
  {
    id: 'gr-atta',
    name: 'Aashirvaad Shudh Chakki Atta',
    category: 'grocery',
    price: 65,
    unit: '1 kg Pack',
    icon: 'Wheat',
    imageColor: 'linear-gradient(135deg, #ffedd5 0%, #ea580c 100%)',
    imageUrl: 'https://images.unsplash.com/photo-1574325131876-a7999788d8b2?q=80&w=500',
    description: '100% pure whole wheat stone-ground chakki flour for soft, fluffy, and nutritious rotis.'
  },
  {
    id: 'gr-dal',
    name: 'Tata Sampann Premium Toor Dal',
    category: 'grocery',
    price: 175,
    unit: '1 kg Pack',
    icon: 'Boxes',
    imageColor: 'linear-gradient(135deg, #fed7aa 0%, #d97706 100%)',
    imageUrl: 'https://images.unsplash.com/photo-1585996746200-4052304df160?q=80&w=500',
    description: 'Unpolished premium pigeon peas (arhar dal). Naturally high in protein and easy to digest.'
  },

  // Snacks & Beverages
  {
    id: 'sb-maggi',
    name: 'Maggi 2-Minute Masala Noodles',
    category: 'snacks-beverages',
    price: 14,
    unit: '70g Single Pack',
    icon: 'Flame',
    imageColor: 'linear-gradient(135deg, #facc15 0%, #dc2626 100%)',
    imageUrl: 'https://images.unsplash.com/photo-1612966608997-30d5290f9b06?q=80&w=500',
    description: 'India\'s favorite instant noodles with the magical Blend of 12 choice spices.'
  },
  {
    id: 'sb-biscuits',
    name: 'Britannia Marie Gold Biscuit',
    category: 'snacks-beverages',
    price: 10,
    unit: '75g Pack',
    icon: 'Cookie',
    imageColor: 'linear-gradient(135deg, #fde047 0%, #eab308 100%)',
    imageUrl: 'https://images.unsplash.com/photo-1558961317-194342a786e2?q=80&w=500',
    description: 'Crisp, light tea-time biscuits packed with the goodness of 10 essential vitamins.'
  },
  {
    id: 'sb-coke',
    name: 'Coca-Cola Original Taste',
    category: 'snacks-beverages',
    price: 40,
    unit: '750ml Bottle',
    icon: 'CupSoda',
    imageColor: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80',
    description: 'Crisp, refreshing original formula Coca-Cola sparkling beverage.'
  },
  {
    id: 'sb-tea',
    name: 'Wagh Bakri Premium Leaf Tea',
    category: 'snacks-beverages',
    price: 140,
    unit: '250g Box',
    icon: 'Coffee',
    imageColor: 'linear-gradient(135deg, #10b981 0%, #064e3b 100%)',
    imageUrl: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=400&q=80',
    description: 'Strong aroma and taste preferred by tea enthusiasts across Maharashtra.'
  },

  // Personal Care
  {
    id: 'pc-handwash',
    name: 'Dettol Liquid Handwash Refill',
    category: 'personal-care',
    price: 99,
    unit: '175ml Pack',
    icon: 'Droplet',
    imageColor: 'linear-gradient(135deg, #a7f3d0 0%, #047857 100%)',
    imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=400&q=80',
    description: 'Germ-protection liquid soap refill, keeping your hands safe and scented.'
  },
  {
    id: 'pc-soap',
    name: 'Santoor Sandal & Turmeric Soap',
    category: 'personal-care',
    price: 38,
    unit: '125g Soap',
    icon: 'Sparkles',
    imageColor: 'linear-gradient(135deg, #fde047 0%, #d97706 100%)',
    imageUrl: 'https://images.unsplash.com/photo-1605264964528-06403738d6df?auto=format&fit=crop&w=400&q=80',
    description: 'Enriched with sandalwood and turmeric extracts to give you smooth, radiant skin.'
  },

  // Household
  {
    id: 'hh-vim',
    name: 'Vim Lemon Dishwash Liquid',
    category: 'household',
    price: 55,
    unit: '250ml Squeeze Bottle',
    icon: 'Droplet',
    imageColor: 'linear-gradient(135deg, #a3e635 0%, #15803d 100%)',
    imageUrl: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=400&q=80',
    description: 'Power of 100 lemons. Instantly removes grease from stainless steel, glass, and clay vessels.'
  },
  {
    id: 'hh-surf',
    name: 'Surf Excel Easy Wash Powder',
    category: 'household',
    price: 140,
    unit: '1 kg Pack',
    icon: 'Sparkles',
    imageColor: 'linear-gradient(135deg, #93c5fd 0%, #1d4ed8 100%)',
    imageUrl: 'https://images.unsplash.com/photo-1610555356070-d0efb6505f21?auto=format&fit=crop&w=400&q=80',
    description: 'Superior stain removal powder that dissolves quickly and gets deep into fabrics.'
  }
];

export const generateInitialInventories = (): { [town in Town]: StoreInventory } => {
  const towns: Town[] = ['Jalgaon', 'Shahada', 'Nandurbar', 'Dhule'];
  const inventories: { [town in Town]?: StoreInventory } = {};

  towns.forEach((town) => {
    const inventory: StoreInventory = {};
    INITIAL_PRODUCTS.forEach((product) => {
      // Add slight variations based on town
      let localPrice = product.price;
      let localStock = 20 + Math.floor(Math.random() * 31); // 20 to 50 items

      if (town === 'Jalgaon') {
        // Main branch has highly loaded stocks, base prices
        localStock += 20; 
      } else if (town === 'Shahada') {
        // Slightly lower stock, price +1/-1
        localPrice += Math.random() > 0.5 ? 2 : -1;
        localStock -= 5;
      } else if (town === 'Nandurbar') {
        // Prices slightly higher due to distance
        localPrice += 3;
        localStock -= 8;
      } else if (town === 'Dhule') {
        localPrice -= Math.random() > 0.5 ? 1 : 2;
        localStock += 5;
      }

      // Guarantee at least some items have lower stock to show alerts, and some are out of stock
      if (product.id === 'fv-mango' && town === 'Nandurbar') {
        localStock = 2; // Low stock alert demo
      }
      if (product.id === 'fv-banana' && town === 'Shahada') {
        localStock = 0; // Out of stock demo
      }

      inventory[product.id] = {
        price: Math.max(5, localPrice), // Ensure positive price
        stock: Math.max(0, localStock),
        isAvailable: localStock > 0
      };
    });
    inventories[town] = inventory;
  });

  return inventories as { [town in Town]: StoreInventory };
};
