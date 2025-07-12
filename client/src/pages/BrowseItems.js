import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Search, Filter, Grid, List, MapPin, Clock, Star } from 'lucide-react';

const BrowseItems = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const categories = [
    'All',
    'Tops',
    'Bottoms',
    'Dresses',
    'Outerwear',
    'Shoes',
    'Accessories',
    'Formal',
    'Casual',
    'Vintage'
  ];

  useEffect(() => {
    fetchItems();
  }, [searchTerm, selectedCategory, currentPage]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: 12,
        ...(searchTerm && { search: searchTerm }),
        ...(selectedCategory && selectedCategory !== 'All' && { category: selectedCategory })
      });

      const response = await axios.get(`/api/items?${params}`);
      const newItems = response.data.items;
      
      if (currentPage === 1) {
        setItems(newItems);
      } else {
        setItems(prev => [...prev, ...newItems]);
      }
      
      setHasMore(newItems.length === 12);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchItems();
  };

  const handleLoadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  const ItemCard = ({ item }) => (
    <div className="card-hover group">
      <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-200 mb-4">
        <img
          src={item.images?.[0] || '/placeholder-item.jpg'}
          alt={item.title}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="badge badge-primary">{item.category}</span>
          <span className="badge badge-gray">{item.condition}</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
          {item.title}
        </h3>
        <p className="text-gray-600 text-sm line-clamp-2">
          {item.description}
        </p>
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center text-sm text-gray-500">
            <MapPin className="w-4 h-4 mr-1" />
            <span>Listed by {item.first_name}</span>
          </div>
          <div className="text-lg font-semibold text-primary-600">
            {item.points_value} pts
          </div>
        </div>
        <Link
          to={`/item/${item.id}`}
          className="btn-primary w-full text-center mt-3"
        >
          View Details
        </Link>
      </div>
    </div>
  );

  const ItemList = ({ item }) => (
    <div className="card-hover group">
      <div className="flex space-x-4">
        <div className="flex-shrink-0">
          <img
            src={item.images?.[0] || '/placeholder-item.jpg'}
            alt={item.title}
            className="h-24 w-24 object-cover rounded-lg"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
              {item.title}
            </h3>
            <div className="text-lg font-semibold text-primary-600">
              {item.points_value} pts
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {item.description}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="badge badge-primary">{item.category}</span>
              <span className="badge badge-gray">{item.condition}</span>
              <div className="flex items-center text-sm text-gray-500">
                <MapPin className="w-4 h-4 mr-1" />
                <span>{item.first_name}</span>
              </div>
            </div>
            <Link
              to={`/item/${item.id}`}
              className="btn-primary"
            >
              View Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Browse Items
          </h1>
          <p className="text-gray-600">
            Discover amazing pieces from our community. Find your next favorite item!
          </p>
        </div>

        {/* Search and Filters */}
        <div className="card mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
              <button type="submit" className="btn-primary px-6">
                Search
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category === selectedCategory ? '' : category);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === category
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-primary-100 text-primary-600'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-primary-100 text-primary-600'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Items Grid/List */}
        {loading && items.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : items.length > 0 ? (
          <>
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
            }>
              {items.map((item) => (
                <div key={item.id}>
                  {viewMode === 'grid' ? <ItemCard item={item} /> : <ItemList item={item} />}
                </div>
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="btn-secondary px-8 py-3"
                >
                  {loading ? 'Loading...' : 'Load More Items'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No items found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search terms or filters to find what you're looking for.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseItems; 