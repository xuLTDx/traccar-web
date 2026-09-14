import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Toolbar,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import TableShimmer from '../common/components/TableShimmer';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useCatch, useCatchCallback } from '../reactHelper';
import useReportStyles from './common/useReportStyles';
import fetchOrThrow from '../common/util/fetchOrThrow';

const BusinessAddressesPage = () => {
  const { classes } = useReportStyles();
  const t = useTranslation();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [removeItem, setRemoveItem] = useState(null);

  const refresh = useCatchCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchOrThrow('/api/businessaddresses', {
        headers: { Accept: 'application/json' },
      });
      setItems(await response.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openEdit = (item) => setEditItem({ ...item });

  const openAdd = () => setEditItem({
    name: '', description: '', address: '', latitude: '', longitude: '', radius: 200,
  });

  const save = useCatch(async () => {
    const response = await fetchOrThrow('/api/businessaddresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...editItem,
        latitude: Number(editItem.latitude),
        longitude: Number(editItem.longitude),
        radius: Number(editItem.radius),
      }),
    });
    const saved = await response.json();
    setItems((prev) => {
      const withoutSaved = prev.filter((item) => item.id !== saved.id);
      return [...withoutSaved, saved];
    });
    setEditItem(null);
  });

  const remove = useCatch(async () => {
    await fetchOrThrow(`/api/businessaddresses/${removeItem.id}`, { method: 'DELETE' });
    setItems((prev) => prev.filter((item) => item.id !== removeItem.id));
    setRemoveItem(null);
  });

  return (
    <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'reportBusinessAddresses']}>
      <div className={classes.container}>
        <div className={classes.containerMain}>
          <Toolbar disableGutters className={classes.header}>
            <IconButton onClick={openAdd} title={t('sharedAdd')}>
              <AddIcon />
            </IconButton>
          </Toolbar>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell className={classes.columnAction} />
                <TableCell>{t('sharedName')}</TableCell>
                <TableCell>{t('sharedDescription')}</TableCell>
                <TableCell>{t('positionAddress')}</TableCell>
                <TableCell>{t('positionLatitude')}</TableCell>
                <TableCell>{t('positionLongitude')}</TableCell>
                <TableCell>{t('commandRadius')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading ? (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className={classes.columnAction} padding="none">
                      <div className={classes.columnActionContainer}>
                        <IconButton size="small" onClick={() => openEdit(item)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => setRemoveItem(item)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </div>
                    </TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.address}</TableCell>
                    <TableCell>{item.latitude}</TableCell>
                    <TableCell>{item.longitude}</TableCell>
                    <TableCell>{item.radius}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableShimmer columns={7} startAction />
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <Dialog open={!!editItem} onClose={() => setEditItem(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t('reportBusinessAddresses')}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label={t('sharedName')}
            value={editItem?.name || ''}
            onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
            autoFocus
          />
          <TextField
            fullWidth
            margin="normal"
            label={t('sharedDescription')}
            value={editItem?.description || ''}
            onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
            multiline
            minRows={2}
          />
          <TextField
            fullWidth
            margin="normal"
            label={t('positionAddress')}
            value={editItem?.address || ''}
            onChange={(e) => setEditItem({ ...editItem, address: e.target.value })}
          />
          <TextField
            fullWidth
            margin="normal"
            label={t('positionLatitude')}
            type="number"
            value={editItem?.latitude ?? ''}
            onChange={(e) => setEditItem({ ...editItem, latitude: e.target.value })}
          />
          <TextField
            fullWidth
            margin="normal"
            label={t('positionLongitude')}
            type="number"
            value={editItem?.longitude ?? ''}
            onChange={(e) => setEditItem({ ...editItem, longitude: e.target.value })}
          />
          <TextField
            fullWidth
            margin="normal"
            label={t('commandRadius')}
            type="number"
            value={editItem?.radius ?? ''}
            onChange={(e) => setEditItem({ ...editItem, radius: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditItem(null)}>{t('sharedCancel')}</Button>
          <Button onClick={save} variant="contained" disabled={!editItem?.name}>{t('sharedSave')}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!removeItem} onClose={() => setRemoveItem(null)}>
        <DialogTitle>{t('sharedRemoveConfirm')}</DialogTitle>
        <DialogActions>
          <Button onClick={() => setRemoveItem(null)}>{t('sharedCancel')}</Button>
          <Button onClick={remove} color="error">{t('sharedRemove')}</Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default BusinessAddressesPage;
