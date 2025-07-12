import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const categories = [
  'Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories', 'Formal', 'Casual', 'Vintage'
];
const types = ['Men', 'Women', 'Unisex', 'Kids'];
const conditions = ['New', 'Like New', 'Good', 'Fair', 'Worn'];

const EditItem = () => {
  const { id } = useParams();
  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/items/${id}`);
        const item = res.data.item;
        setValue('title', item.title);
        setValue('description', item.description);
        setValue('category', item.category);
        setValue('type', item.type);
        setValue('size', item.size);
        setValue('condition', item.condition);
        setValue('tags', item.tags ? item.tags.join(', ') : '');
        setValue('pointsValue', item.points_value);
        setValue('isAvailable', item.is_available);
        setExistingImages(item.images || []);
      } catch (err) {
        toast.error('Failed to load item');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
    // eslint-disable-next-line
  }, [id, setValue, navigate]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('category', data.category);
    formData.append('type', data.type);
    formData.append('size', data.size);
    formData.append('condition', data.condition);
    formData.append('tags', data.tags);
    formData.append('pointsValue', data.pointsValue);
    formData.append('isAvailable', data.isAvailable);
    if (data.images && data.images.length > 0) {
      Array.from(data.images).forEach((file) => {
        formData.append('images', file);
      });
    }
    try {
      await axios.put(`/api/items/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Item updated successfully!');
      reset();
      navigate('/dashboard');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update item';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImagePreviews(files.map(file => URL.createObjectURL(file)));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Edit Item</h2>
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
              {...register('images', { validate: files => !files || files.length <= 5 || 'You can upload up to 5 images' })}
              className="mt-1"
              onChange={handleImageChange}
            />
            {errors.images && <p className="text-red-500 text-xs mt-1">{errors.images.message}</p>}
            <div className="flex space-x-2 mt-2">
              {existingImages.map((src, idx) => (
                <img key={idx} src={src} alt="existing" className="w-16 h-16 object-cover rounded" />
              ))}
              {imagePreviews.map((src, idx) => (
                <img key={idx} src={src} alt="preview" className="w-16 h-16 object-cover rounded" />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Available</label>
            <select {...register('isAvailable')} className="input-field mt-1">
              <option value={true}>Yes</option>
              <option value={false}>No</option>
            </select>
          </div>
          <button
            type="submit"
            className="btn-primary w-full py-3 text-lg font-semibold"
            disabled={submitting}
          >
            {submitting ? 'Updating Item...' : 'Update Item'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditItem; 