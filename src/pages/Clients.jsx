import { useState } from 'react';
import { Plus, Search, Trash2, Users, Edit2, UserPlus, Pencil } from 'lucide-react';
import Modal from '../components/Modal';
import ImportButton from '../components/ImportButton';
import ExportButton from '../components/ExportButton';
import { useClients } from '../hooks/useClients';
import { transformClientData } from '../utils/importExcel';
import './Clients.css';

export default function Clients() {
    const { clients, loading, addClient, deleteClient, updateClient, importClients } = useClients();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [search, setSearch] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        phone: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) return;

        try {
            if (editingClient) {
                // Update existing client
                await updateClient(editingClient.id, formData);
            } else {
                // Auto-generate reference for new client
                const nextNumber = clients.length + 1;
                const reference = `CLI-${String(nextNumber).padStart(4, '0')}`;

                await addClient({
                    reference,
                    ...formData,
                    created_at: new Date().toISOString()
                });
            }
            setFormData({ name: '', phone: '' });
            setEditingClient(null);
            setIsModalOpen(false);
        } catch (error) {
            alert(`Error ${editingClient ? 'updating' : 'adding'} client: ` + error.message);
        }
    };

    const handleEdit = (client) => {
        setEditingClient(client);
        setFormData({
            name: client.name,
            phone: client.phone
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingClient(null);
        setFormData({ name: '', phone: '' });
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this client?')) {
            try {
                await deleteClient(id);
            } catch (error) {
                alert('Error deleting client: ' + error.message);
            }
        }
    };

    const filteredClients = clients.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search) ||
        c.reference?.toLowerCase().includes(search.toLowerCase())
    );

    const handleImport = async (excelData) => {
        try {
            const importedClients = excelData.map(row => transformClientData(row));
            const validClients = importedClients.filter(c => c.name);
            await importClients(validClients);
            alert(`Successfully imported ${validClients.length} clients!`);
        } catch (error) {
            alert('Error importing clients: ' + error.message);
        }
    };

    return (
        <div className="clients-page fade-in">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <Users size={32} />
                        Clients Management
                    </h1>
                    <p className="page-subtitle">Manage your customer database</p>
                </div>

                <div className="header-actions">
                    <div className="search-wrapper">
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Search clients..."
                            className="input search-input"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <Plus size={18} /> Add Client
                    </button>
                    <ImportButton type="client" onImport={handleImport} />
                    <ExportButton data={clients} type="client" />
                </div>
            </div>

            {/* Stats Bar */}
            <div className="stats-bar">
                <div className="stat-item">
                    <Users size={20} />
                    <span className="stat-label">Total Clients</span>
                    <span className="stat-value">{clients.length}</span>
                </div>
                <div className="stat-item">
                    <Search size={20} />
                    <span className="stat-label">Filtered</span>
                    <span className="stat-value">{filteredClients.length}</span>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="empty-state">
                    <div className="loading-spinner"></div>
                    <p>Loading clients...</p>
                </div>
            ) : clients.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">
                        <UserPlus size={64} />
                    </div>
                    <h3>No clients yet</h3>
                    <p>Add your first client to get started</p>
                    <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                        <Plus size={18} /> Add First Client
                    </button>
                </div>
            ) : (
                <div className="clients-table-container">
                    <table className="clients-table">
                        <thead>
                            <tr>
                                <th>Reference</th>
                                <th>Name</th>
                                <th>Phone</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClients.length > 0 ? (
                                filteredClients.map((client, index) => (
                                    <tr key={client.id} style={{ animationDelay: `${index * 0.03}s` }}>
                                        <td>
                                            <span className="badge badge-info">
                                                {client.reference || 'N/A'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="client-name">
                                                <div className="client-avatar">
                                                    <Users size={18} />
                                                </div>
                                                <span>{client.name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="phone-number">{client.phone}</span>
                                        </td>
                                        <td className="text-right">
                                            <div className="action-buttons">
                                                <button
                                                    className="action-btn edit-btn"
                                                    onClick={() => handleEdit(client)}
                                                    title="Edit Client"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    className="action-btn delete-btn"
                                                    onClick={() => handleDelete(client.id)}
                                                    title="Delete Client"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr className="no-results">
                                    <td colSpan="4">
                                        <Search size={32} />
                                        <p>No clients found matching "{search}"</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingClient ? "Edit Client" : "Add New Client"}
            >
                <form onSubmit={handleSubmit} className="client-form">
                    <div className="form-group">
                        <label>Full Name *</label>
                        <input
                            required
                            type="text"
                            className="input"
                            placeholder="e.g. Ahmed Alami"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Phone Number</label>
                        <input
                            type="tel"
                            className="input"
                            placeholder="06 12 34 56 78"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        />
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
                            {editingClient ? (
                                <><Edit2 size={16} /> Update Client</>
                            ) : (
                                <><Plus size={16} /> Save Client</>
                            )}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
