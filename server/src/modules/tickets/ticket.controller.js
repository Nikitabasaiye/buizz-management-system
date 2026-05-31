const ticketRepository = require('./ticket.repository');
const { USER_ROLES } = require('../../constants');

const getTickets = async (req, res, next) => {
  try {
    const filters = { ...req.query };
    if (![USER_ROLES.ADMIN, USER_ROLES.ORGANIZER].includes(req.user.role)) {
      filters.userId = req.user.id;
    }

    const result = await ticketRepository.findAll(filters);

    res.status(200).json({
      status: 'success',
      message: result.tickets.length ? 'Tickets fetched successfully' : 'No tickets found',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTickets
};
