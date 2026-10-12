import React from 'react';
import { Navigate } from 'react-router-dom';

/** Compatibility entry for old bookmarks. Car creation now lives in the operator fleet screen. */
export const AddCarPage: React.FC = () => <Navigate to="/operator/cars" replace />;
