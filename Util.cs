using System.Diagnostics;
using System.Net;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;

namespace PainterPro
{
	public static class Util
	{
		public const string swishDomain = "https://mss.cpc.getswish.net";
		public const string swishCreatePath = "/swish-cpcapi/api/v2/paymentrequests/";
		public const string swishQrPath = "/qrg-swish/api/v1/commerce/";
		public const string swishIp = "213.132.115.94:443";

		public static string currentDirectory = Directory.GetParent(Directory.GetCurrentDirectory()).Parent.Parent.FullName;
		public static Dictionary<string, object> appsettings = JsonSerializer.Deserialize<Dictionary<string, object>>(File.OpenRead(currentDirectory + "\\appsettings.json"));

		static X509Certificate2Collection certificates = new X509Certificate2Collection()
		{
			new X509Certificate2(currentDirectory + "\\certificates\\swish\\Swish_Merchant_TestCertificate_1234679304.p12", "swish"),
			new X509Certificate2(currentDirectory + "\\certificates\\swish\\Swish_Merchant_TestCertificate_1234679304.pem", "swish")
		};
		static HttpClientHandler swishCertificateHandler = new HttpClientHandler();

		static Util()
		{
			// https://github.com/RickardPettersson/swish-api-csharp/issues/3
			// https://stackoverflow.com/a/61681840
			foreach (X509Certificate2 certificate in certificates)
			{
				swishCertificateHandler.ClientCertificates.Add(certificate);
			}
			swishCertificateHandler.ClientCertificateOptions = ClientCertificateOption.Manual;
			swishCertificateHandler.SslProtocols = System.Security.Authentication.SslProtocols.Tls12;
		}

		public static HttpClient GetSwishClient(string domain = swishDomain)
		{
			HttpClient client = new HttpClient(swishCertificateHandler);
			client.BaseAddress = new Uri(domain);
			return client;
		}

		public static string GrammaticalListing(IEnumerable<object> collection)
		{
			int count = collection.Count();
			if (count >= 2)
			{
				return string.Join(", ", collection.Take(count - 1)) + " and " + collection.Last();
			}
			else if (count == 1)
			{
				string? firstString = collection.First().ToString();
				if (firstString == null)
				{
					return "";
				}
				return firstString;
			}
			return "";
		}
	}

	public static class MyConsole
	{
		public static ConsoleColor color
		{
			set
			{
#if DEBUG
				Console.ForegroundColor = value;
#endif
			}
		}

		public static void SetStatusColor(bool condition)
		{
			if (condition)
			{
				color = ConsoleColor.Green;
			}
			else
			{
				color = ConsoleColor.Red;
			}
		}

		public static void Write(object value)
		{
			Debug.Write(value);
#if DEBUG
			Console.Write(value);
#endif
		}

		public static void WriteLine(object value)
		{
			Write("\r\n");
			Write(value);
		}

		public static void WriteTimestamp()
		{
			color = ConsoleColor.White;
			WriteLine(DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss.fff"));
			color = ConsoleColor.Blue;
		}

		public static void WriteData(string name, object data)
		{
			color = ConsoleColor.White;
			WriteLine(name + ": ");
			color = ConsoleColor.Magenta;
			Write(data);
		}

		public static void WriteMany(params object?[] elements)
		{
			foreach (object? element in elements)
			{
				if (element != null)
				{
					Write(" " + element.ToString());
				}
			}
		}

		public static void WriteHttpStatus(HttpListenerContext context)
		{
			SetStatusColor(context.Response.StatusCode >= 100 && context.Response.StatusCode < 400);
			WriteMany(context.Response.StatusCode, context.Response.StatusDescription);
			if (context.Response.RedirectLocation != null)
			{
				color = ConsoleColor.Magenta;
				WriteMany("->", context.Response.RedirectLocation);
			}
		}
	}
}