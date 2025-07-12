import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { 
  ArrowRight, 
  ShoppingBag, 
  Users, 
  Leaf, 
  Star,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const LandingPage = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const [featuredItems, setFeaturedItems] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_users: 0,
    total_items: 0,
    completed_swaps: 0,
    user_rating: 4.8 // Hardcoded for now
  });

  useEffect(() => {
    const fetchFeaturedItems = async () => {
      try {
        const response = await axios.get('/api/items/featured');
        setFeaturedItems(response.data.items);
      } catch (error) {
        console.error('Error fetching featured items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedItems();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Try public stats endpoint first
        let response;
        try {
          response = await axios.get('/api/stats');
        } catch (err) {
          // fallback to admin stats if public not available and user is admin
          if (isAdmin) {
            response = await axios.get('/api/admin/stats');
          }
        }
        if (response && response.data.stats) {
          setStats({
            total_users: response.data.stats.total_users || 0,
            total_items: response.data.stats.total_items || 0,
            completed_swaps: response.data.stats.completed_swaps || 0,
            user_rating: 4.8 // Hardcoded for now
          });
        }
      } catch (error) {
        // fallback to default
        setStats({
          total_users: 0,
          total_items: 0,
          completed_swaps: 0,
          user_rating: 4.8
        });
      }
    };
    fetchStats();
  }, [isAdmin]);

  const statsList = [
    { icon: Users, value: stats.total_users, label: 'Active Users' },
    { icon: ShoppingBag, value: stats.total_items, label: 'Items Listed' },
    { icon: Leaf, value: stats.completed_swaps, label: 'Successful Swaps' },
    { icon: Star, value: stats.user_rating, label: 'User Rating' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => 
        prev === featuredItems.length - 1 ? 0 : prev + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [featuredItems.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => 
      prev === featuredItems.length - 1 ? 0 : prev + 1
    );
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => 
      prev === 0 ? featuredItems.length - 1 : prev - 1
    );
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
              Sustainable Fashion
              <span className="block text-2xl md:text-4xl font-normal mt-2">
                Starts with ReWear
              </span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto text-primary-100">
              Join our community of eco-conscious fashion lovers. Swap clothes, reduce waste, 
              and discover unique pieces while helping the planet.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to={isAuthenticated ? "/browse" : "/register"}
                className="bg-white text-primary-600 hover:bg-gray-100 px-8 py-4 rounded-lg font-semibold text-lg transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <span>{isAuthenticated ? 'Start Swapping' : 'Join ReWear'}</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/browse"
                className="border-2 border-white text-white hover:bg-white hover:text-primary-600 px-8 py-4 rounded-lg font-semibold text-lg transition-colors duration-200"
              >
                Browse Items
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {statsList.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-8 h-8 text-primary-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Items Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Featured Items
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover amazing pieces from our community. Each item has a story and is looking for a new home.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : featuredItems.length > 0 ? (
            <div className="relative">
              <div className="overflow-hidden rounded-xl">
                <div 
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                  {featuredItems.map((item, index) => (
                    <div key={item.id} className="w-full flex-shrink-0">
                      <div className="max-w-4xl mx-auto">
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                          <div className="md:flex">
                            <div className="md:w-1/2">
                              <img
                                src={item.images?.[0] || '/placeholder-item.jpg'}
                                alt={item.title}
                                className="w-full h-64 md:h-full object-cover"
                              />
                            </div>
                            <div className="md:w-1/2 p-8">
                              <div className="flex items-center space-x-2 mb-4">
                                <span className="badge badge-primary">{item.category}</span>
                                <span className="badge badge-gray">{item.condition}</span>
                              </div>
                              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                                {item.title}
                              </h3>
                              <p className="text-gray-600 mb-6 line-clamp-3">
                                {item.description}
                              </p>
                              <div className="flex items-center justify-between mb-6">
                                <div className="text-sm text-gray-500">
                                  Listed by {item.first_name} {item.last_name}
                                </div>
                                <div className="text-lg font-semibold text-primary-600">
                                  {item.points_value} points
                                </div>
                              </div>
                              <Link
                                to={`/item/${item.id}`}
                                className="btn-primary w-full text-center"
                              >
                                View Details
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Carousel Controls */}
              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow"
              >
                <ChevronLeft className="w-6 h-6 text-gray-600" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow"
              >
                <ChevronRight className="w-6 h-6 text-gray-600" />
              </button>

              {/* Dots */}
              <div className="flex justify-center mt-6 space-x-2">
                {featuredItems.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      index === currentSlide ? 'bg-primary-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No featured items available at the moment.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Start Your Sustainable Fashion Journey?
          </h2>
          <p className="text-xl mb-8 text-primary-100 max-w-2xl mx-auto">
            Join thousands of users who are already making a difference by swapping clothes instead of buying new.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={isAuthenticated ? "/add-item" : "/register"}
              className="bg-white text-primary-600 hover:bg-gray-100 px-8 py-4 rounded-lg font-semibold text-lg transition-colors duration-200"
            >
              {isAuthenticated ? 'List an Item' : 'Get Started'}
            </Link>
            <Link
              to="/browse"
              className="border-2 border-white text-white hover:bg-white hover:text-primary-600 px-8 py-4 rounded-lg font-semibold text-lg transition-colors duration-200"
            >
              Explore Items
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage; 