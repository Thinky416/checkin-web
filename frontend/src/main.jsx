import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// 不开 StrictMode：盖章的墨点飞溅是命令式 DOM 动画，开发态双次挂载会重复触发
createRoot(document.getElementById('root')).render(<App />);
