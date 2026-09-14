import { useState, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
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
  Select,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import {
  formatDistance,
  formatTime,
} from '../common/util/formatter';
import ReportFilter from './components/ReportFilter';
import { useAttributePreference } from '../common/util/preferences';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import TableShimmer from '../common/components/TableShimmer';
import AddressValue from '../common/components/AddressValue';
import { useCatch, useCatchCallback } from '../reactHelper';
import useReportStyles from './common/useReportStyles';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { deviceEquality } from '../common/util/deviceEquality';

const purposeKey = (item) => `${item.deviceId}-${item.startPositionId}-${item.endPositionId}`;

const csvEscape = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const LogbookReportPage = () => {
  const { classes } = useReportStyles();
  const t = useTranslation();

  const devices = useSelector((state) => state.devices.items, deviceEquality(['id', 'name']));

  const distanceUnit = useAttributePreference('distanceUnit');

  const [items, setItems] = useState([]);
  const [purposes, setPurposes] = useState({});
  const [loading, setLoading] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editPurpose, setEditPurpose] = useState('business');
  const [editNote, setEditNote] = useState('');

  const purposesFor = useCallback((deviceIds) => Promise.all(
    deviceIds.map(async (deviceId) => {
      const response = await fetchOrThrow(`/api/trippurposes?deviceId=${deviceId}`, {
        headers: { Accept: 'application/json' },
      });
      return response.json();
    }),
  ), []);

  const onShow = useCatchCallback(async ({ deviceIds, groupIds, from, to }) => {
    const query = new URLSearchParams({ from, to });
    deviceIds.forEach((deviceId) => query.append('deviceId', deviceId));
    groupIds.forEach((groupId) => query.append('groupId', groupId));
    setLoading(true);
    try {
      const response = await fetchOrThrow(`/api/reports/trips?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      const trips = await response.json();
      setItems(trips);

      const tripDeviceIds = [...new Set(trips.map((item) => item.deviceId))];
      const purposeLists = await purposesFor(tripDeviceIds);
      const map = {};
      purposeLists.flat().forEach((purpose) => {
        map[purposeKey(purpose)] = purpose;
      });
      setPurposes(map);
    } finally {
      setLoading(false);
    }
  }, [purposesFor]);

  const suggestedNote = (item) => item.endSuggestedNote || item.startSuggestedNote || '';

  const openEdit = (item) => {
    const existing = purposes[purposeKey(item)];
    setEditItem(item);
    setEditPurpose(existing?.purpose || 'business');
    setEditNote(existing?.note ?? suggestedNote(item));
  };

  const savePurpose = useCatch(async () => {
    const body = {
      deviceId: editItem.deviceId,
      startPositionId: editItem.startPositionId,
      endPositionId: editItem.endPositionId,
      purpose: editPurpose,
      note: editNote,
    };
    const response = await fetchOrThrow('/api/trippurposes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const saved = await response.json();
    setPurposes((prev) => ({ ...prev, [purposeKey(saved)]: saved }));
    setEditItem(null);
  });

  const purposeLabel = (value) => {
    switch (value) {
      case 'private':
        return t('reportTripPurposePrivate');
      case 'commute':
        return t('reportTripPurposeCommute');
      case 'business':
      default:
        return t('reportTripPurposeBusiness');
    }
  };

  const rows = useMemo(() => items
    // A trip a company vehicle logbook doesn't make accounting sense for -
    // Traccar's trip detection produces these from GPS jitter while
    // stationary, distinct from a real (if short) trip.
    .filter((item) => item.distance > 0)
    .map((item, index) => ({
      ...item,
      sequenceNumber: index + 1,
      purposeItem: purposes[purposeKey(item)],
    })), [items, purposes]);

  const onExport = useCatch(async () => {
    const headers = [
      t('reportSequenceNumber'),
      t('sharedDriver'),
      t('reportStartTime'),
      t('reportEndTime'),
      t('reportTripPurpose'),
      t('reportTripPurposeNote'),
      t('reportStartAddress'),
      t('reportEndAddress'),
      t('sharedDistance'),
      t('reportStartOdometer'),
      t('reportEndOdometer'),
    ];
    const lines = [headers.map(csvEscape).join(',')];
    rows.forEach((row) => {
      const purpose = row.purposeItem;
      lines.push([
        row.sequenceNumber,
        row.driverName || '',
        formatTime(row.startTime, 'minutes'),
        formatTime(row.endTime, 'minutes'),
        purposeLabel(purpose?.purpose),
        purpose?.note || '',
        row.startBusinessAddress || row.startGeofenceName || row.startAddress
          || `${row.startLat}, ${row.startLon}`,
        row.endBusinessAddress || row.endGeofenceName || row.endAddress
          || `${row.endLat}, ${row.endLon}`,
        formatDistance(row.distance, distanceUnit, t),
        formatDistance(row.startOdometer, distanceUnit, t),
        formatDistance(row.endOdometer, distanceUnit, t),
      ].map(csvEscape).join(','));
    });
    const blob = new Blob([`﻿${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'kniha_jazd.csv';
    link.click();
    URL.revokeObjectURL(url);
  });

  return (
    <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'reportLogbook']}>
      <div className={classes.container}>
        <div className={classes.containerMain}>
          <div className={classes.header}>
            <ReportFilter onShow={onShow} onExport={onExport} deviceType="multiple" loading={loading} formats={['csv']} />
          </div>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell className={classes.columnAction} />
                <TableCell>{t('reportSequenceNumber')}</TableCell>
                <TableCell>{t('sharedDevice')}</TableCell>
                <TableCell>{t('sharedDriver')}</TableCell>
                <TableCell>{t('reportStartTime')}</TableCell>
                <TableCell>{t('reportEndTime')}</TableCell>
                <TableCell>{t('reportTripPurpose')}</TableCell>
                <TableCell>{t('reportStartAddress')}</TableCell>
                <TableCell>{t('reportEndAddress')}</TableCell>
                <TableCell>{t('sharedDistance')}</TableCell>
                <TableCell>{t('reportStartOdometer')}</TableCell>
                <TableCell>{t('reportEndOdometer')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading ? (
                rows.map((item) => (
                  <TableRow key={`${item.startPositionId}-${item.endPositionId}`}>
                    <TableCell className={classes.columnAction} padding="none">
                      <IconButton size="small" onClick={() => openEdit(item)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                    <TableCell>{item.sequenceNumber}</TableCell>
                    <TableCell>{devices[item.deviceId]?.name}</TableCell>
                    <TableCell>{item.driverName}</TableCell>
                    <TableCell>{formatTime(item.startTime, 'minutes')}</TableCell>
                    <TableCell>{formatTime(item.endTime, 'minutes')}</TableCell>
                    <TableCell>
                      {item.purposeItem ? (
                        <>
                          {purposeLabel(item.purposeItem.purpose)}
                          {item.purposeItem.note ? ` – ${item.purposeItem.note}` : ''}
                        </>
                      ) : (
                        suggestedNote(item) && (
                          <em>
                            {purposeLabel('business')}
                            {' – '}
                            {suggestedNote(item)}
                            {' ('}
                            {t('reportTripPurposeSuggested')}
                            {')'}
                          </em>
                        )
                      )}
                    </TableCell>
                    <TableCell>
                      {item.startBusinessAddress || item.startGeofenceName || (
                        <AddressValue
                          latitude={item.startLat}
                          longitude={item.startLon}
                          originalAddress={item.startAddress}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {item.endBusinessAddress || item.endGeofenceName || (
                        <AddressValue
                          latitude={item.endLat}
                          longitude={item.endLon}
                          originalAddress={item.endAddress}
                        />
                      )}
                    </TableCell>
                    <TableCell>{formatDistance(item.distance, distanceUnit, t)}</TableCell>
                    <TableCell>{formatDistance(item.startOdometer, distanceUnit, t)}</TableCell>
                    <TableCell>{formatDistance(item.endOdometer, distanceUnit, t)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableShimmer columns={12} startAction />
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <Dialog open={!!editItem} onClose={() => setEditItem(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t('reportTripPurpose')}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>{t('reportTripPurpose')}</InputLabel>
            <Select
              label={t('reportTripPurpose')}
              value={editPurpose}
              onChange={(e) => setEditPurpose(e.target.value)}
            >
              <MenuItem value="business">{t('reportTripPurposeBusiness')}</MenuItem>
              <MenuItem value="private">{t('reportTripPurposePrivate')}</MenuItem>
              <MenuItem value="commute">{t('reportTripPurposeCommute')}</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            margin="normal"
            label={t('reportTripPurposeNote')}
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditItem(null)}>{t('sharedCancel')}</Button>
          <Button onClick={savePurpose} variant="contained">{t('sharedSave')}</Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default LogbookReportPage;
