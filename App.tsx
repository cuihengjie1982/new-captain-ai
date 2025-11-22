
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppRoute } from './types';
import Layout from './components/Layout';
import Login from './pages/Login';
import Blog from './pages/Blog';
import BlogDetail from './pages/BlogDetail';
import Diagnosis from './pages/Diagnosis';
import Solution from './pages/Solution';
import SolutionDetail from './pages/SolutionDetail';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import MyVideos from './pages/MyVideos';
import MyArticles from './pages/MyArticles';
import MyNotes from './pages/MyNotes';
import Settings from './pages/Settings';
import Plans from './pages/Plans';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path={AppRoute.LOGIN} element={<Login />} />
          <Route path={AppRoute.BLOG} element={<Blog />} />
          <Route path={AppRoute.BLOG_DETAIL} element={<BlogDetail />} />
          <Route path={AppRoute.DIAGNOSIS} element={<Diagnosis />} />
          <Route path={AppRoute.SOLUTION} element={<Solution />} />
          <Route path={AppRoute.SOLUTION_DETAIL} element={<SolutionDetail />} />
          <Route path={AppRoute.DASHBOARD} element={<Dashboard />} />
          
          {/* User Center Routes */}
          <Route path={AppRoute.MY_VIDEOS} element={<MyVideos />} />
          <Route path={AppRoute.MY_ARTICLES} element={<MyArticles />} />
          <Route path={AppRoute.MY_NOTES} element={<MyNotes />} />
          <Route path={AppRoute.SETTINGS} element={<Settings />} />
          <Route path={AppRoute.PLANS} element={<Plans />} />
          
          <Route path={AppRoute.ADMIN} element={<Admin />} />
          <Route path="*" element={<Navigate to={AppRoute.BLOG} replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
