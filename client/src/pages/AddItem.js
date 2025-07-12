import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const categories = [
  'Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories', 'Formal', 'Casual', 'Vintage'
];
const types = ['Men', 'Women', 'Unisex', 'Kids'];
const conditions = ['New', 'Like New', 'Good', 'Fair', 'Worn'];

const AddItem = () => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [imagePreviews, setImagePreviews] = useState([]);
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('category', data.category);
    formData.append('type', data.type);
    formData.append('size', data.size);
    formData.append('condition', data.condition);
    formData.append('tags', data.tags);
    formData.append('pointsValue', data.pointsValue);
    if (data.images && data.images.length > 0) {
      Array.from(data.images).forEach((file) => {
        formData.append('images', file);
      });
    }
    try {
      await axios.post('/api/items', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Item listed successfully!');
      reset();
      navigate('/dashboard');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to add item';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImagePreviews(files.map(file => URL.createObjectURL(file)));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">List a New Item</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" encType="multipart/form-data">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              {...register('title', { required: 'Title is required' })}
              className={`input-field mt-1 ${errors.title ? 'border-red-500' : ''}`}
              placeholder="e.g. Blue Denim Jacket"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              {...register('description', { required: 'Description is required' })}
              className={`input-field mt-1 ${errors.description ? 'border-red-500' : ''}`}
              placeholder="Describe your item..."
              rows={3}
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                {...register('category', { required: 'Category is required' })}
                className={`input-field mt-1 ${errors.category ? 'border-red-500' : ''}`}
              >
                <option value="">Select</option>
                {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select
                {...register('type', { required: 'Type is required' })}
                className={`input-field mt-1 ${errors.type ? 'border-red-500' : ''}`}
              >
                <option value="">Select</option>
                {types.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Size</label>
              <input
                type="text"
                {...register('size', { required: 'Size is required' })}
                className={`input-field mt-1 ${errors.size ? 'border-red-500' : ''}`}
                placeholder="e.g. M, L, 32, 8, etc."
              />
              {errors.size && <p className="text-red-500 text-xs mt-1">{errors.size.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Condition</label>
              <select
                {...register('condition', { required: 'Condition is required' })}
                className={`input-field mt-1 ${errors.condition ? 'border-red-500' : ''}`}
              >
                <option value="">Select</option>
                {conditions.map((cond) => <option key={cond} value={cond}>{cond}</option>)}
              </select>
              {errors.condition && <p className="text-red-500 text-xs mt-1">{errors.condition.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Tags (comma separated)</label>
            <input
              type="text"
              {...register('tags')}
              className="input-field mt-1"
              placeholder="e.g. summer, casual, cotton"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Points Value</label>
            <input
              type="number"
              {...register('pointsValue', { required: 'Points value is required', min: 10, max: 500 })}
              className={`input-field mt-1 ${errors.pointsValue ? 'border-red-500' : ''}`}
              placeholder="e.g. 50"
              min={10}
              max={500}
            />
            {errors.pointsValue && <p className="text-red-500 text-xs mt-1">{errors.pointsValue.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Images (up to 5)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              {...register('images', { required: 'At least one image is required', validate: files => files.length <= 5 || 'You can upload up to 5 images' })}
              className="mt-1"
              onChange={handleImageChange}
            />
            {errors.images && <p className="text-red-500 text-xs mt-1">{errors.images.message}</p>}
            <div className="flex space-x-2 mt-2">
              {imagePreviews.map((src, idx) => (
                <img key={idx} src={src} alt="preview" className="w-16 h-16 object-cover rounded" />
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="btn-primary w-full py-3 text-lg font-semibold"
            disabled={loading}
          >
            {loading ? 'Listing Item...' : 'List Item'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddItem; 