/* eslint-disable @typescript-eslint/no-unused-vars */
import { AuthenticatedUser } from '@Common';
import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma';

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminDashboardReport() {
    try {
      const [
        totalEvents,
        completedEvents,
        activeEvents,
        suspendedEvents,
        totalBookings,
        confirmedBookings,
        pendingBookings,
        totalUsers,
        totalManagers,
        splitAggregates,
        recentEvents,
      ] = await Promise.all([
        this.prisma.event.count(),
        this.prisma.event.count({ where: { status: 'Completed' } }),
        this.prisma.event.count({ where: { status: 'Active' } }),
        this.prisma.event.count({ where: { status: 'Suspended' } }),
        this.prisma.booking.aggregate({
          _sum: { quantity: true },
        }),

        this.prisma.booking.aggregate({
          where: { status: 'Confirmed' },
          _sum: { quantity: true },
        }),

        this.prisma.booking.aggregate({
          where: { status: 'Pending' },
          _sum: { quantity: true },
        }),

        this.prisma.user.count({ where: { role: 'User' } }),

        this.prisma.user.count({ where: { role: 'Manager' } }),

        this.prisma.revenueSplit.groupBy({
          by: ['splitType'],
          where: { booking: { status: 'Confirmed' } },
          _sum: { amount: true },
        }),

        this.prisma.event.findMany({
          take: 10,
          include: {
            manager: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true,
              },
            },
            bookings: {
              where: { status: 'Confirmed' },
              include: { splits: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const adminRevenue =
        splitAggregates.find((s) => s.splitType === 'Admin')?._sum.amount ?? 0;

      const managerRevenue =
        splitAggregates.find((s) => s.splitType === 'Manager')?._sum.amount ??
        0;

      const eventWiseReport = recentEvents.map((event) => {
        const totalSales = event.bookings.reduce(
          (sum, b) => sum + Number(b.total),
          0,
        );

        const allSplits = event.bookings.flatMap((b) => b.splits);

        const adminEarnings = allSplits
          .filter((s) => s.splitType === 'Admin')
          .reduce((sum, s) => sum + Number(s.amount), 0);

        const managerEarnings = allSplits
          .filter((s) => s.splitType === 'Manager')
          .reduce((sum, s) => sum + Number(s.amount), 0);

        const remainingSeats = event.totalSeats - event.bookedSeats;

        const estimatedLoss =
          event.status === 'Completed'
            ? remainingSeats * Number(event.price)
            : 0;

        const occupancyRate =
          event.totalSeats > 0
            ? ((event.bookedSeats / event.totalSeats) * 100).toFixed(2)
            : '0';

        return {
          eventId: event.id,
          title: event.title,
          performer: event.performer,
          venue: event.venue,
          city: event.city,
          country: event.country,
          eventDate: event.date,
          eventStatus: event.status,
          manager: {
            id: event.manager.id,
            name: `${event.manager.firstname} ${event.manager.lastname}`,
            email: event.manager.email,
          },
          price: event.price,
          totalSeats: event.totalSeats,
          bookedSeats: event.bookedSeats,
          remainingSeats,
          occupancyRate: `${occupancyRate}%`,
          totalSales,
          adminEarnings,
          managerEarnings,
          estimatedLoss,
          createdAt: event.createdAt,
        };
      });

      return {
        status: 'success',
        dashboard: {
          overview: {
            totalEvents,
            activeEvents,
            completedEvents,
            suspendedEvents,
            totalBookings: totalBookings._sum.quantity ?? 0,
            confirmedBookings: confirmedBookings._sum.quantity ?? 0,
            pendingBookings: pendingBookings._sum.quantity ?? 0,
            totalUsers,
            totalManagers,
            totalRevenue: Number(adminRevenue) + Number(managerRevenue),
            totalAdminRevenue: Number(adminRevenue),
            totalManagerRevenue: Number(managerRevenue),
          },
          recentEvents: eventWiseReport,
          eventWiseReport,
        },
      };
    } catch (error) {
      console.error(error);
      throw new Error('Failed to generate admin dashboard');
    }
  }

  async getAdminManagerWiseReport() {
    try {
      const managers = await this.prisma.user.findMany({
        where: {
          role: 'Manager',
        },
        include: {
          events: {
            include: {
              bookings: {
                where: {
                  status: 'Confirmed',
                },
                include: {
                  splits: true,
                },
              },
            },
          },
        },
      });

      const report = managers.map((manager) => {
        const totalEvents = manager.events.length;

        const activeEvents = manager.events.filter(
          (event) => event.status === 'Active',
        ).length;

        const completedEvents = manager.events.filter(
          (event) => event.status === 'Completed',
        ).length;

        const suspendedEvents = manager.events.filter(
          (event) => event.status === 'Suspended',
        ).length;

        const allBookings = manager.events.flatMap((event) => event.bookings);

        const totalRevenue = allBookings.reduce(
          (sum, booking) => sum + Number(booking.total),
          0,
        );

        const allSplits = allBookings.flatMap((booking) => booking.splits);

        const managerEarnings = allSplits
          .filter((split) => split.splitType === 'Manager')
          .reduce((sum, split) => sum + Number(split.amount), 0);

        const adminEarnings = allSplits
          .filter((split) => split.splitType === 'Admin')
          .reduce((sum, split) => sum + Number(split.amount), 0);

        const totalSeats = manager.events.reduce(
          (sum, event) => sum + event.totalSeats,
          0,
        );

        const bookedSeats = manager.events.reduce(
          (sum, event) => sum + event.bookedSeats,
          0,
        );
        const occupancyRate =
          totalSeats > 0 ? ((bookedSeats / totalSeats) * 100).toFixed(2) : '0';

        return {
          managerId: manager.id,
          managerName: `${manager.firstname} ${manager.lastname}`,
          email: manager.email,
          totalEvents,
          activeEvents,
          completedEvents,
          suspendedEvents,
          totalBookings: bookedSeats,
          totalRevenue,
          managerEarnings,
          adminEarnings,
          totalSeats,
          bookedSeats,
          occupancyRate: `${occupancyRate}%`,
        };
      });
      return {
        status: 'success',
        managers: report,
      };
    } catch (error) {
      console.log(error);
      throw new Error('Failed to generate manager-wise report');
    }
  }

  async getAdminManagerReport(managerId: number) {
    try {
      const manager = await this.prisma.user.findFirst({
        where: {
          id: managerId,
          role: 'Manager',
        },
        include: {
          events: {
            select: {
              status: true,
              totalSeats: true,
              bookedSeats: true,
              bookings: {
                where: {
                  status: 'Confirmed',
                },
                select: {
                  total: true,
                  splits: {
                    select: {
                      splitType: true,
                      amount: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!manager) {
        throw new Error('Manager not found');
      }

      let activeEvents = 0;
      let completedEvents = 0;
      let suspendedEvents = 0;

      let totalRevenue = 0;
      let managerEarnings = 0;
      let adminEarnings = 0;

      let totalSeats = 0;
      let bookedSeats = 0;

      for (const event of manager.events) {
        if (event.status === 'Active') activeEvents++;
        else if (event.status === 'Completed') completedEvents++;
        else if (event.status === 'Suspended') suspendedEvents++;

        totalSeats += event.totalSeats;
        bookedSeats += event.bookedSeats;

        for (const booking of event.bookings) {
          totalRevenue += Number(booking.total);

          for (const split of booking.splits) {
            if (split.splitType === 'Manager') {
              managerEarnings += Number(split.amount);
            } else if (split.splitType === 'Admin') {
              adminEarnings += Number(split.amount);
            }
          }
        }
      }

      const occupancyRate =
        totalSeats > 0 ? ((bookedSeats / totalSeats) * 100).toFixed(2) : '0.00';

      return {
        status: 'success',
        data: {
          managerId: manager.id,
          managerName: `${manager.firstname} ${manager.lastname}`,
          email: manager.email,

          totalEvents: manager.events.length,
          activeEvents,
          completedEvents,
          suspendedEvents,

          totalBookings: bookedSeats,

          totalRevenue,
          managerEarnings,
          adminEarnings,

          totalSeats,
          bookedSeats,

          occupancyRate: `${occupancyRate}%`,
        },
      };
    } catch (error) {
      console.log(error);
      throw new Error('Failed to generate manager report');
    }
  }

  async getAdminEventWiseReport() {
    try {
      const events = await this.prisma.event.findMany({
        include: {
          bookings: {
            include: {
              splits: true,
            },
          },
          manager: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const report = events.map((event) => {
        const confirmedBookings = event.bookings.filter(
          (booking) => booking.status === 'Confirmed',
        );

        const pendingBookings = event.bookings.filter(
          (booking) => booking.status === 'Pending',
        );

        const totalSales = confirmedBookings.reduce(
          (sum, booking) => sum + Number(booking.total),
          0,
        );

        const allSplits = confirmedBookings.flatMap(
          (booking) => booking.splits,
        );

        const managerEarnings = allSplits
          .filter((split) => split.splitType === 'Manager')
          .reduce((sum, split) => sum + Number(split.amount), 0);

        const adminEarnings = allSplits
          .filter((split) => split.splitType === 'Admin')
          .reduce((sum, split) => sum + Number(split.amount), 0);

        const remainingSeats = event.totalSeats - event.bookedSeats;

        const estimatedLoss =
          event.status === 'Completed'
            ? remainingSeats * Number(event.price)
            : 0;

        const occupancyRate =
          event.totalSeats > 0
            ? ((event.bookedSeats / event.totalSeats) * 100).toFixed(2)
            : '0';

        return {
          eventId: event.id,
          title: event.title,
          performer: event.performer,
          venue: event.venue,
          city: event.city,
          country: event.country,
          eventDate: event.date,
          eventStatus: event.status,
          price: event.price,
          totalSeats: event.totalSeats,
          bookedSeats: event.bookedSeats,
          remainingSeats,
          occupancyRate: `${occupancyRate}%`,
          totalConfirmedBookings: confirmedBookings.length,
          totalPendingBookings: pendingBookings.length,
          totalSales,
          managerEarnings,
          adminEarnings,
          estimatedLoss,
          createdAt: event.createdAt,
        };
      });

      return {
        status: 'success',
        report,
      };
    } catch (error) {
      throw new Error('Failed to generate event-wise report');
    }
  }

  async getAdminEventReport(eventId: number) {
    try {
      const event = await this.prisma.event.findUnique({
        where: {
          id: eventId,
        },
        include: {
          manager: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
            },
          },
          bookings: {
            select: {
              status: true,
              total: true,
              splits: {
                select: {
                  splitType: true,
                  amount: true,
                },
              },
            },
          },
        },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      let totalConfirmedBookings = 0;
      let totalPendingBookings = 0;
      let totalSales = 0;
      let managerEarnings = 0;
      let adminEarnings = 0;

      for (const booking of event.bookings) {
        if (booking.status === 'Confirmed') {
          totalConfirmedBookings++;
          totalSales += Number(booking.total);

          for (const split of booking.splits) {
            if (split.splitType === 'Manager') {
              managerEarnings += Number(split.amount);
            } else if (split.splitType === 'Admin') {
              adminEarnings += Number(split.amount);
            }
          }
        }

        if (booking.status === 'Pending') {
          totalPendingBookings++;
        }
      }

      const remainingSeats = event.totalSeats - event.bookedSeats;

      const estimatedLoss =
        event.status === 'Completed' ? remainingSeats * Number(event.price) : 0;

      const occupancyRate =
        event.totalSeats > 0
          ? ((event.bookedSeats / event.totalSeats) * 100).toFixed(2)
          : '0.00';

      return {
        status: 'success',
        report: {
          eventId: event.id,
          title: event.title,
          performer: event.performer,
          venue: event.venue,
          city: event.city,
          country: event.country,
          eventDate: event.date,
          eventStatus: event.status,
          price: event.price,
          totalSeats: event.totalSeats,
          bookedSeats: event.bookedSeats,
          remainingSeats,
          occupancyRate: `${occupancyRate}%`,
          totalConfirmedBookings,
          totalPendingBookings,
          totalSales,
          manager: {
            id: event.manager?.id,
            firstname: event.manager?.firstname,
            lastname: event.manager?.lastname,
          },
          managerEarnings,
          adminEarnings,
          estimatedLoss,
          createdAt: event.createdAt,
        },
      };
    } catch (error) {
      throw new Error('Failed to generate event report');
    }
  }

  async getManagerDashboardReport(managerId: number) {
    try {
      const eventManagerId = { managerId };
      const confirmedBooking: Prisma.BookingWhereInput = {
        event: {
          managerId,
        },
        status: 'Confirmed',
      };

      const pendingBooking: Prisma.BookingWhereInput = {
        event: {
          managerId,
        },
        status: 'Pending',
      };

      const [
        totalEvents,
        activeEvents,
        suspendedEvents,
        completedEvents,
        totalConfirmedBookings,
        totalPendingBookings,
        sales,
        managerRevenue,
        adminRevenue,
        seatStats,
        events,
      ] = await Promise.all([
        this.prisma.event.count({
          where: eventManagerId,
        }),

        this.prisma.event.count({
          where: {
            ...eventManagerId,
            status: 'Active',
          },
        }),

        this.prisma.event.count({
          where: {
            ...eventManagerId,
            status: 'Suspended',
          },
        }),

        this.prisma.event.count({
          where: {
            ...eventManagerId,
            status: 'Completed',
          },
        }),

        this.prisma.booking.aggregate({
          where: confirmedBooking,
          _sum: {
            quantity: true,
          },
        }),

        this.prisma.booking.count({
          where: pendingBooking,
        }),

        this.prisma.booking.aggregate({
          where: confirmedBooking,
          _sum: {
            total: true,
          },
          _avg: {
            total: true,
          },
        }),

        this.prisma.revenueSplit.aggregate({
          where: {
            splitType: 'Manager',
            booking: confirmedBooking,
          },

          _sum: {
            amount: true,
          },
        }),

        this.prisma.revenueSplit.aggregate({
          where: {
            splitType: 'Admin',
            booking: confirmedBooking,
          },
          _sum: {
            amount: true,
          },
        }),

        this.prisma.event.aggregate({
          where: eventManagerId,

          _sum: {
            totalSeats: true,
            bookedSeats: true,
          },
        }),

        this.prisma.event.findMany({
          where: {
            managerId,
          },
          include: {
            bookings: {
              where: {
                status: 'Confirmed',
              },
              include: {
                splits: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
      ]);

      const totalSeats = seatStats._sum.totalSeats ?? 0;

      const bookedSeats = seatStats._sum.bookedSeats ?? 0;

      const eventWiseReport = events.map((event) => {
        const totalSales = event.bookings.reduce(
          (sum: number, booking) => sum + Number(booking.total),
          0,
        );

        const allSplits = event.bookings.flatMap((booking) => booking.splits);

        const managerEarnings = allSplits
          .filter((split) => split.splitType === 'Manager')
          .reduce((sum: number, split) => sum + Number(split.amount), 0);

        const adminEarnings = allSplits
          .filter((split) => split.splitType === 'Admin')
          .reduce((sum: number, split) => sum + Number(split.amount), 0);

        const remainingSeats = event.totalSeats - event.bookedSeats;

        const estimatedLoss =
          event.status === 'Completed'
            ? remainingSeats * Number(event.price)
            : 0;

        const occupancyRate =
          event.totalSeats > 0
            ? ((event.bookedSeats / event.totalSeats) * 100).toFixed(2)
            : '0';

        return {
          eventId: event.id,
          title: event.title,
          performer: event.performer,
          venue: event.venue,
          city: event.city,
          country: event.country,
          eventDate: event.date,
          eventStatus: event.status,
          price: event.price,
          totalSeats: event.totalSeats,
          bookedSeats: event.bookedSeats,
          remainingSeats,
          occupancyRate: `${occupancyRate}%`,
          totalConfirmedBookings: totalConfirmedBookings._sum.quantity ?? 0,
          totalSales,
          managerEarnings,
          adminEarnings,
          estimatedLoss,
          createdAt: event.createdAt,
        };
      });

      const totalEstimatedLoss = eventWiseReport.reduce(
        (sum, event) => sum + event.estimatedLoss,
        0,
      );

      return {
        status: 'success',

        dashboard: {
          totalEvents,
          activeEvents,
          suspendedEvents,
          completedEvents,
          bookings: {
            totalConfirmedBookings: totalConfirmedBookings._sum.quantity ?? 0,
            totalPendingBookings,
          },
          totalSales: sales._sum.total ?? 0,
          averageSale: sales._avg.total ?? 0,
          managerEarnings: managerRevenue._sum.amount ?? 0,
          adminEarnings: adminRevenue._sum.amount ?? 0,
          totalSeats,
          bookedSeats,
          remainingSeats: totalSeats - bookedSeats,
          totalEstimatedLoss,
          recentEvents: eventWiseReport.slice(0, 1),
          eventWiseReport: eventWiseReport.slice(0, 1),
        },
      };
    } catch (error) {
      console.log(error);
      throw new Error('Failed to generate manager dashboard');
    }
  }

  async getManagerEventWiseReport(managerId: number) {
    try {
      const events = await this.prisma.event.findMany({
        where: {
          managerId,
        },
        include: {
          bookings: {
            include: {
              splits: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const report = events.map((event) => {
        const confirmedBookings = event.bookings.filter(
          (booking) => booking.status === 'Confirmed',
        );

        const pendingBookings = event.bookings.filter(
          (booking) => booking.status === 'Pending',
        );

        const totalSales = confirmedBookings.reduce(
          (sum, booking) => sum + Number(booking.total),
          0,
        );

        const allSplits = confirmedBookings.flatMap(
          (booking) => booking.splits,
        );

        const managerEarnings = allSplits
          .filter((split) => split.splitType === 'Manager')
          .reduce((sum, split) => sum + Number(split.amount), 0);

        const adminEarnings = allSplits
          .filter((split) => split.splitType === 'Admin')
          .reduce((sum, split) => sum + Number(split.amount), 0);

        const remainingSeats = event.totalSeats - event.bookedSeats;

        const estimatedLoss =
          event.status === 'Completed'
            ? remainingSeats * Number(event.price)
            : 0;

        const occupancyRate =
          event.totalSeats > 0
            ? ((event.bookedSeats / event.totalSeats) * 100).toFixed(2)
            : '0';

        return {
          eventId: event.id,
          title: event.title,
          performer: event.performer,
          venue: event.venue,
          city: event.city,
          country: event.country,
          eventDate: event.date,
          eventStatus: event.status,
          price: event.price,
          totalSeats: event.totalSeats,
          bookedSeats: event.bookedSeats,
          remainingSeats,
          occupancyRate: `${occupancyRate}%`,
          totalConfirmedBookings: confirmedBookings.length,
          totalPendingBookings: pendingBookings.length,
          totalSales,
          managerEarnings,
          adminEarnings,
          estimatedLoss,
          createdAt: event.createdAt,
        };
      });

      return {
        status: 'success',
        report,
      };
    } catch (error) {
      throw new Error('Failed to generate manager event report');
    }
  }

  async getManagerEventReport(ctx: AuthenticatedUser, eventId: number) {
    try {
      const event = await this.prisma.event.findUnique({
        where: {
          id: eventId,
          managerId: ctx.id,
        },
        include: {
          manager: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
            },
          },
          bookings: {
            select: {
              status: true,
              total: true,
              splits: {
                select: {
                  splitType: true,
                  amount: true,
                },
              },
            },
          },
        },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      let totalConfirmedBookings = 0;
      let totalPendingBookings = 0;
      let totalSales = 0;
      let managerEarnings = 0;
      let adminEarnings = 0;

      for (const booking of event.bookings) {
        if (booking.status === 'Confirmed') {
          totalConfirmedBookings++;
          totalSales += Number(booking.total);

          for (const split of booking.splits) {
            if (split.splitType === 'Manager') {
              managerEarnings += Number(split.amount);
            } else if (split.splitType === 'Admin') {
              adminEarnings += Number(split.amount);
            }
          }
        }

        if (booking.status === 'Pending') {
          totalPendingBookings++;
        }
      }

      const remainingSeats = event.totalSeats - event.bookedSeats;

      const estimatedLoss =
        event.status === 'Completed' ? remainingSeats * Number(event.price) : 0;

      const occupancyRate =
        event.totalSeats > 0
          ? ((event.bookedSeats / event.totalSeats) * 100).toFixed(2)
          : '0.00';

      return {
        status: 'success',
        report: {
          eventId: event.id,
          title: event.title,
          performer: event.performer,
          venue: event.venue,
          city: event.city,
          country: event.country,
          eventDate: event.date,
          eventStatus: event.status,
          price: event.price,
          totalSeats: event.totalSeats,
          bookedSeats: event.bookedSeats,
          remainingSeats,
          occupancyRate: `${occupancyRate}%`,
          totalConfirmedBookings,
          totalPendingBookings,
          totalSales,
          manager: {
            id: event.manager?.id,
            firstname: event.manager?.firstname,
            lastname: event.manager?.lastname,
          },
          managerEarnings,
          adminEarnings,
          estimatedLoss,
          createdAt: event.createdAt,
        },
      };
    } catch (error) {
      throw new Error('Failed to get event report!');
    }
  }
}
