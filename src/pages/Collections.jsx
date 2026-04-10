import { useState } from 'react';
import { Plus, Search, Trash2, Pencil, Edit2, FolderOpen, Tag } from 'lucide-react';
import Modal from '../components/Modal';
import { useCollections } from '../hooks/useCollections';
import './Collections.css';

export default function Collections() {
    const { collections, loading, addCollection, deleteCollection, updateCollection } = useCollections();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCollection, setEditingCollection] = useState(null);
    const [search, setSearch] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) return;

        try {
            if (editingCollection) {
                await updateCollection(editingCollection.id, formData);
            } else {
                await addCollection({
                    ...formData,
                    created_at: new Date().toISOString()
                });
            }
            setFormData({ name: '', description: '' });
            setEditingCollection(null);
            setIsModalOpen(false);
        } catch (error) {
            alert(`Error ${editingCollection ? 'updating' : 'adding'} collection: ` + error.message);
        }
    };

    const handleEdit = (collection) => {
        setEditingCollection(collection);
        setFormData({
            name: collection.name,
            description: collection.description || ''
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCollection(null);
        setFormData({ name: '', description: '' });
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this collection?')) {
            try {
                await deleteCollection(id);
            } catch (error) {
                alert('Error deleting collection: ' + error.message);
            }
        }
    };

    const filteredCollections = collections.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="collections-page fade-in">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <FolderOpen size={32} />
                        Collections
                    </h1>
                    <p className="page-subtitle">Organize your products into collections</p>
                </div>

                <div className="header-actions">
                    <div className="search-wrapper">
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Search collections..."
                            className="input search-input"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <Plus size={18} /> Add Collection
                    </button>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="stats-bar">
                <div className="stat-item">
                    <Tag size={20} />
                    <span className="stat-label">Total Collections</span>
                    <span className="stat-value">{collections.length}</span>
                </div>
                <div className="stat-item">
                    <Search size={20} />
                    <span className="stat-label">Filtered</span>
                    <span className="stat-value">{filteredCollections.length}</span>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="empty-state">
                    <div className="loading-spinner"></div>
                    <p>Loading collections...</p>
                </div>
            ) : collections.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">
                        <FolderOpen size={64} />
                    </div>
                    <h3>No collections yet</h3>
                    <p>Create your first collection to organize products</p>
                    <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                        <Plus size={18} /> Add First Collection
                    </button>
                </div>
            ) : (
                <div className="collections-grid">
                    {filteredCollections.map((collection, index) => (
                        <div key={collection.id} className="collection-card" style={{ animationDelay: `${index * 0.05}s` }}>
                            <div className="collection-icon">
                                <Tag size={32} />
                            </div>
                            <div className="collection-details">
                                <h3 className="collection-name">{collection.name}</h3>
                                {collection.description && (
                                    <p className="collection-description">{collection.description}</p>
                                )}
                            </div>
                            <div className="collection-actions">
                                <button
                                    onClick={() => handleEdit(collection)}
                                    className="action-btn edit-btn"
                                    title="Edit Collection"
                                >
                                    <Pencil size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(collection.id)}
                                    className="action-btn delete-btn"
                                    title="Delete Collection"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingCollection ? "Edit Collection" : "Add New Collection"}
            >
                <form onSubmit={handleSubmit} className="collection-form">
                    <div className="form-group">
                        <label>Collection Name *</label>
                        <input
                            required
                            type="text"
                            className="input"
                            placeholder="e.g. Electronics, Clothing"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            className="input"
                            rows="3"
                            placeholder="Describe this collection..."
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        ></textarea>
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={handleCloseModal}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {editingCollection ? (
                                <><Edit2 size={16} /> Update Collection</>
                            ) : (
                                <><Plus size={16} /> Save Collection</>
                            )}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
