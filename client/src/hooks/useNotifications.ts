import { useEffect, useRef } from 'react';
// import { io, Socket } from 'socket.io-client'; // TODO: Install socket.io-client when backend implements WebSocket
import { useDispatch, useSelector } from 'react-redux';
import { addNotification, markAsRead, setUnreadCount } from '../store/notificationSlice';
import { RootState } from '../store/store';

const useNotifications = () => {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state: RootState) => state.auth);
  // const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token || !user?.id) return;

    // TODO: Implement socket.io when backend WebSocket support is ready
    // const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001';
    // socketRef.current = io(socketUrl, {
    //   auth: {
    //     token,
    //   },
    // });

    // const socket = socketRef.current;

    // // Listen for new notifications
    // socket.on('notification:new', (notification) => {
    //   dispatch(addNotification(notification));
    // });

    // // Listen for read-all events
    // socket.on('notification:read-all', ({ userId }) => {
    //   if (userId === user.id) {
    //     dispatch(markAllAsRead());
    //   }
    // });

    // // Listen for unread count updates
    // socket.on('notification:unread-count', ({ count }) => {
    //   dispatch(setUnreadCount(count));
    // });

    // return () => {
    //   socket.off('notification:new');
    //   socket.off('notification:read-all');
    //   socket.off('notification:unread-count');
    //   socket.disconnect();
    // };
  }, [token, user?.id, dispatch]);

  return {
    socket: null,
  };
};

export default useNotifications;
