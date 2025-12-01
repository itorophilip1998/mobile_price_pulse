import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ProtectedScreen } from '@/components/auth/protected-screen';
import { useAuth } from '@/hooks/use-auth';
import { router } from 'expo-router';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviews: number;
  discount?: number;
  category: string;
  vendor: string;
}

// Generate over 1000 products
const generateMockProducts = (): Product[] => {
  const categories = ['Electronics', 'Home & Kitchen', 'Sports', 'Office', 'Fashion', 'Beauty', 'Books', 'Toys', 'Automotive', 'Garden'];
  const vendors = [
    'TechStore', 'WearableTech', 'HomeEssentials', 'SportZone', 'WorkSpace', 'FitLife',
    'StyleHub', 'BeautyCorp', 'BookWorld', 'ToyLand', 'AutoParts', 'GardenPro',
    'SmartHome', 'FitnessPlus', 'OfficeMax', 'FashionForward', 'CosmeticCo', 'ReadMore',
    'PlayTime', 'CarCare', 'GreenThumb', 'TechGiant', 'HomeBase', 'ActiveWear',
    'DeskPro', 'Trendy', 'GlowUp', 'PageTurner', 'FunZone', 'DriveSmart', 'Bloom'
  ];
  
  const productNames = [
    // Electronics
    'Wireless Bluetooth Headphones', 'Smart Watch Pro', 'Laptop Stand', 'USB-C Hub', 'Wireless Mouse',
    'Mechanical Keyboard', 'Monitor Stand', 'Webcam HD', 'Microphone USB', 'Speaker Bluetooth',
    'Tablet Stand', 'Phone Case', 'Screen Protector', 'Power Bank', 'Cable Organizer',
    'Smart Light Bulb', 'Security Camera', 'Router WiFi', 'Smart Plug', 'Fitness Tracker',
    
    // Home & Kitchen
    'Premium Coffee Maker', 'Air Fryer', 'Instant Pot', 'Blender Pro', 'Toaster Oven',
    'Stand Mixer', 'Food Processor', 'Rice Cooker', 'Slow Cooker', 'Electric Kettle',
    'Dishwasher Safe', 'Cutting Board', 'Knife Set', 'Cookware Set', 'Baking Sheets',
    'Storage Containers', 'Can Opener', 'Garlic Press', 'Measuring Cups', 'Kitchen Scale',
    
    // Sports
    'Running Shoes', 'Yoga Mat Premium', 'Dumbbells Set', 'Resistance Bands', 'Jump Rope',
    'Foam Roller', 'Water Bottle', 'Gym Bag', 'Tennis Racket', 'Basketball',
    'Soccer Ball', 'Baseball Glove', 'Golf Clubs', 'Bicycle Helmet', 'Swimming Goggles',
    'Fitness Tracker', 'Pull Up Bar', 'Kettlebell', 'Exercise Ball', 'Yoga Blocks',
    
    // Office
    'Desk Organizer', 'Monitor Arm', 'Ergonomic Chair', 'Standing Desk', 'Desk Lamp',
    'File Organizer', 'Pen Holder', 'Notebook Set', 'Stapler', 'Paper Shredder',
    'Label Maker', 'Calculator', 'Desk Mat', 'Cable Management', 'Whiteboard',
    'Desk Fan', 'USB Hub', 'Laptop Cooling Pad', 'Mouse Pad', 'Desk Drawer',
    
    // Fashion
    'Designer Sunglasses', 'Leather Wallet', 'Watch Classic', 'Backpack', 'Handbag',
    'Sneakers', 'Boots', 'Sandals', 'Jacket', 'Hoodie',
    'Jeans', 'T-Shirt', 'Dress', 'Shirt', 'Pants',
    'Hat', 'Scarf', 'Belt', 'Socks', 'Underwear',
    
    // Beauty
    'Face Moisturizer', 'Sunscreen SPF50', 'Cleanser', 'Toner', 'Serum',
    'Eye Cream', 'Face Mask', 'Lip Balm', 'Makeup Brushes', 'Foundation',
    'Mascara', 'Eyeliner', 'Lipstick', 'Blush', 'Highlighter',
    'Nail Polish', 'Hair Shampoo', 'Conditioner', 'Hair Dryer', 'Straightener',
    
    // Books
    'Fiction Novel', 'Non-Fiction', 'Biography', 'Cookbook', 'Self-Help',
    'Business Book', 'History', 'Science', 'Philosophy', 'Poetry',
    'Comic Book', 'Manga', 'Textbook', 'Dictionary', 'Atlas',
    'Journal', 'Notebook', 'Planner', 'Coloring Book', 'Children Book',
    
    // Toys
    'Action Figure', 'Doll', 'Puzzle', 'Board Game', 'Card Game',
    'Building Blocks', 'Remote Car', 'Drone', 'Robot Toy', 'Stuffed Animal',
    'Art Set', 'Musical Instrument', 'Science Kit', 'Magic Set', 'LEGO Set',
    'Play Kitchen', 'Tool Set', 'Dress Up', 'Outdoor Toys', 'Educational Toy',
    
    // Automotive
    'Car Phone Mount', 'Dash Cam', 'Car Charger', 'Seat Cover', 'Floor Mat',
    'Steering Wheel Cover', 'Air Freshener', 'Tire Gauge', 'Jump Starter', 'Car Vacuum',
    'Car Organizer', 'Sun Shade', 'Trunk Organizer', 'License Plate Frame', 'Car Wash Kit',
    'Wax', 'Polish', 'Tire Shine', 'Interior Cleaner', 'Exterior Cleaner',
    
    // Garden
    'Garden Tool Set', 'Watering Can', 'Garden Hose', 'Plant Pot', 'Garden Gloves',
    'Pruning Shears', 'Shovel', 'Rake', 'Trowel', 'Plant Food',
    'Seeds Pack', 'Garden Decor', 'Outdoor Lights', 'Bird Feeder', 'Plant Stand',
    'Garden Kneeler', 'Wheelbarrow', 'Compost Bin', 'Garden Fence', 'Sprinkler'
  ];
  
  const emojis = [
    '🎧', '⌚', '💻', '📱', '🖱️', '⌨️', '🖥️', '📹', '🎤', '🔊',
    '☕', '🍳', '🥘', '🍲', '🍞', '🥖', '🍰', '🍪', '🥤', '🍽️',
    '👟', '🧘', '🏋️', '⚽', '🏀', '🎾', '🏐', '🏓', '🏸', '🎯',
    '📝', '📋', '📊', '📈', '📉', '✏️', '🖊️', '🖍️', '📌', '📍',
    '👓', '👜', '👔', '👗', '👕', '👖', '🧥', '🧦', '👠', '👢',
    '💄', '💅', '🧴', '🧼', '🧽', '🪒', '🧴', '🧴', '🧴', '🧴',
    '📚', '📖', '📗', '📘', '📙', '📕', '📓', '📔', '📒', '📃',
    '🧸', '🎮', '🎲', '🃏', '🎯', '🎨', '🖼️', '🎭', '🎪', '🎬',
    '🚗', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚',
    '🌱', '🌿', '🍀', '🌾', '🌷', '🌹', '🌺', '🌻', '🌼', '🌸'
  ];
  
  const products: Product[] = [];
  
  for (let i = 1; i <= 1200; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const vendor = vendors[Math.floor(Math.random() * vendors.length)];
    const nameIndex = Math.floor(Math.random() * productNames.length);
    const baseName = productNames[nameIndex];
    const name = i <= productNames.length ? baseName : `${baseName} ${Math.floor(i / 100) + 1}`;
    
    const hasDiscount = Math.random() > 0.3; // 70% have discounts
    const originalPrice = 10 + Math.random() * 990; // $10 - $1000
    const discount = hasDiscount ? Math.floor(10 + Math.random() * 50) : undefined; // 10-60% off
    const price = hasDiscount 
      ? originalPrice * (1 - (discount! / 100))
      : originalPrice;
    
    const rating = 3.5 + Math.random() * 1.5; // 3.5 - 5.0
    const reviews = Math.floor(10 + Math.random() * 1990); // 10 - 2000 reviews
    
    products.push({
      id: i.toString(),
      name,
      price: Math.round(price * 100) / 100,
      originalPrice: hasDiscount ? Math.round(originalPrice * 100) / 100 : undefined,
      image: emojis[Math.floor(Math.random() * emojis.length)],
      rating: Math.round(rating * 10) / 10,
      reviews,
      discount,
      category,
      vendor,
    });
  }
  
  return products;
};

const mockProducts: Product[] = generateMockProducts();

function MarketplaceContent() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Electronics', 'Home & Kitchen', 'Sports', 'Office', 'Fashion', 'Beauty', 'Books', 'Toys', 'Automotive', 'Garden'];

  const filteredProducts = mockProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity style={styles.productCard} activeOpacity={0.8}>
      {/* Product Image */}
      <View style={styles.productImageContainer}>
        <Text style={styles.productEmoji}>{item.image}</Text>
        {item.discount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{item.discount}%</Text>
          </View>
        )}
      </View>

      {/* Product Info */}
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.productVendor}>{item.vendor}</Text>

        {/* Rating */}
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingStar}>★</Text>
          <Text style={styles.ratingText}>{item.rating}</Text>
          <Text style={styles.reviewsText}> • {item.reviews} reviews</Text>
        </View>

        {/* Price */}
        <View style={styles.priceContainer}>
          <Text style={styles.price}>${item.price.toFixed(2)}</Text>
          {item.originalPrice && (
            <Text style={styles.originalPrice}>${item.originalPrice.toFixed(2)}</Text>
          )}
        </View>

        {/* Action Button */}
        <TouchableOpacity style={styles.viewDealButton} activeOpacity={0.8}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Text style={styles.viewDealText}>View Deal</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Marketplace</Text>
            <Text style={styles.headerSubtitle}>Discover amazing deals</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/profile')}>
            <View style={styles.profileButton}>
              <Text style={styles.profileEmoji}>👤</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for products..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              onPress={() => setSelectedCategory(category)}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.categoryButtonActive,
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category && styles.categoryTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <View style={styles.productsGrid}>
            {filteredProducts.map((product) => (
              <View key={product.id}>{renderProduct({ item: product })}</View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No products found</Text>
            <Text style={styles.emptyStateSubtext}>Try a different search</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default function MarketplaceScreen() {
  return (
    <ProtectedScreen>
      <MarketplaceContent />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileEmoji: {
    fontSize: 24,
  },
  searchContainer: {
    marginTop: 8,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#111827',
  },
  scrollContent: {
    padding: 20,
  },
  categoriesContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  categoryButtonActive: {
    backgroundColor: '#667eea',
  },
  categoryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 16,
  },
  productImageContainer: {
    height: 180,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  productEmoji: {
    fontSize: 72,
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  productInfo: {
    padding: 16,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 22,
  },
  productVendor: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingStar: {
    fontSize: 16,
    color: '#FBBF24',
    marginRight: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  reviewsText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  price: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  originalPrice: {
    fontSize: 16,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  viewDealButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    overflow: 'hidden',
  },
  viewDealText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#9CA3AF',
  },
});

